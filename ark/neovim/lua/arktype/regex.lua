-- A backtracking matcher for the JavaScript regular expressions ErrorLens
-- compiles its `errorLens.replace` matchers with: `new RegExp(matcher, "iu")`.
--
-- Only that one flag set exists here, so its semantics are fixed:
-- - `u`: the subject and pattern are sequences of code points, `.` matches any
--   code point but \n, \r, \u2028 and \u2029, and `\u{...}` escapes are valid.
-- - `i`: characters, classes and backreferences compare by Unicode simple case
--   folding (`arktype.casefold`, generated from V8), exactly as V8 does.
-- - no `m`, `s`, `g` or `y`: `^`/`$` anchor the whole input and `exec` starts
--   searching at index 0.
--
-- Matching follows the ECMAScript spec's backtracking order (greedy and lazy
-- quantifiers, alternation priority, captures reset on each iteration of a
-- quantified group, empty iterations rejected), so every capture is the one
-- V8 would return. Lookbehind and named groups are not supported and raise an
-- error at compile time rather than matching differently.

local casefold = require("arktype.casefold")

local canon_of = casefold.canon
local members_of = casefold.members

local M = {}

---@param cp integer
---@return integer
local function canon(cp)
	return canon_of[cp] or cp
end

--- Decodes UTF-8 into code points, keeping each one's byte offset so captures
--- slice the original string. Invalid bytes become one code point each.
---@param s string
---@return integer[] cps, integer[] offsets
local function decode(s)
	local cps, offsets = {}, {}
	local i, len = 1, #s
	while i <= len do
		local c = s:byte(i)
		local cp, size
		if c < 0x80 then
			cp, size = c, 1
		elseif c >= 0xC2 and c < 0xE0 and i + 1 <= len then
			cp, size = (c - 0xC0) * 0x40 + (s:byte(i + 1) - 0x80), 2
		elseif c >= 0xE0 and c < 0xF0 and i + 2 <= len then
			cp, size =
				(c - 0xE0) * 0x1000 + (s:byte(i + 1) - 0x80) * 0x40 + (s:byte(i + 2) - 0x80),
				3
		elseif c >= 0xF0 and c < 0xF5 and i + 3 <= len then
			cp, size =
				(c - 0xF0) * 0x40000
					+ (s:byte(i + 1) - 0x80) * 0x1000
					+ (s:byte(i + 2) - 0x80) * 0x40
					+ (s:byte(i + 3) - 0x80),
				4
		else
			cp, size = 0xDC00 + c, 1
		end
		cps[#cps + 1] = cp
		offsets[#offsets + 1] = i
		i = i + size
	end
	offsets[#cps + 1] = len + 1
	return cps, offsets
end
M.decode = decode

local function is_line_terminator(cp)
	return cp == 0x0A or cp == 0x0D or cp == 0x2028 or cp == 0x2029
end

local function is_digit(cp)
	return cp >= 0x30 and cp <= 0x39
end

local function is_ascii_word(cp)
	return (cp >= 0x61 and cp <= 0x7A)
		or (cp >= 0x41 and cp <= 0x5A)
		or is_digit(cp)
		or cp == 0x5F
end

-- With `iu`, \w also matches whatever folds to an ASCII word character
-- (U+017F ſ, U+212A K). A class's canonical member is its lowest code point,
-- so it is ASCII whenever the class contains an ASCII character.
local function is_word(cp)
	return is_ascii_word(cp) or is_ascii_word(canon(cp))
end

local whitespace = {
	[0x09] = true,
	[0x0A] = true,
	[0x0B] = true,
	[0x0C] = true,
	[0x0D] = true,
	[0x20] = true,
	[0xA0] = true,
	[0x1680] = true,
	[0x2028] = true,
	[0x2029] = true,
	[0x202F] = true,
	[0x205F] = true,
	[0x3000] = true,
	[0xFEFF] = true,
}

local function is_space(cp)
	return whitespace[cp] == true or (cp >= 0x2000 and cp <= 0x200A)
end

local escape_tests = {
	d = is_digit,
	D = function(cp)
		return not is_digit(cp)
	end,
	w = is_word,
	W = function(cp)
		return not is_word(cp)
	end,
	s = is_space,
	S = function(cp)
		return not is_space(cp)
	end,
}

local control_escapes = { n = 0x0A, r = 0x0D, t = 0x09, v = 0x0B, f = 0x0C }

-- Characters `u`-mode patterns may escape to mean themselves.
local syntax_chars = {}
for c in ("^$\\.*+?()[]{}|/"):gmatch(".") do
	syntax_chars[c:byte()] = true
end

---@class arktype.regex.Parser
---@field cps integer[]
---@field pos integer
---@field groups integer
---@field source string

local function parse_error(p, message)
	error(
		("arktype: unsupported or invalid regex %q at %d: %s"):format(p.source, p.pos, message),
		0
	)
end

local function peek(p, offset)
	return p.cps[p.pos + (offset or 0)]
end

local function eat(p, cp)
	if p.cps[p.pos] == cp then
		p.pos = p.pos + 1
		return true
	end
	return false
end

local function hex_value(cp)
	if cp == nil then
		return nil
	elseif is_digit(cp) then
		return cp - 0x30
	elseif cp >= 0x61 and cp <= 0x66 then
		return cp - 0x57
	elseif cp >= 0x41 and cp <= 0x46 then
		return cp - 0x37
	end
end

local function parse_hex(p, count)
	local value = 0
	for _ = 1, count do
		local digit = hex_value(peek(p))
		if not digit then
			parse_error(p, "expected a hex digit")
		end
		value = value * 16 + digit
		p.pos = p.pos + 1
	end
	return value
end

-- Parses the escape after a backslash. Returns a code point, or a test
-- function for a class escape, or a node for an assertion/backreference.
local function parse_escape(p, in_class)
	local cp = peek(p)
	if cp == nil then
		parse_error(p, "trailing backslash")
	end
	p.pos = p.pos + 1
	local c = string.char(cp < 128 and cp or 0)
	if escape_tests[c] then
		return { test = escape_tests[c] }
	elseif control_escapes[c] then
		return control_escapes[c]
	elseif c == "0" and not is_digit(peek(p) or 0) then
		return 0
	elseif c == "b" then
		if in_class then
			return 0x08
		end
		return { node = { type = "boundary", negate = false } }
	elseif c == "B" and not in_class then
		return { node = { type = "boundary", negate = true } }
	elseif c == "x" then
		return parse_hex(p, 2)
	elseif c == "u" then
		if eat(p, 0x7B) then
			local value, digits = 0, 0
			while hex_value(peek(p)) do
				value = value * 16 + hex_value(peek(p))
				digits = digits + 1
				p.pos = p.pos + 1
			end
			if digits == 0 or not eat(p, 0x7D) or value > 0x10FFFF then
				parse_error(p, "invalid \\u{...} escape")
			end
			return value
		end
		local value = parse_hex(p, 4)
		-- a surrogate pair written as two \u escapes is one code point
		if value >= 0xD800 and value <= 0xDBFF and peek(p) == 0x5C and peek(p, 1) == 0x75 then
			local save = p.pos
			p.pos = p.pos + 2
			local ok, low = pcall(parse_hex, p, 4)
			if ok and low >= 0xDC00 and low <= 0xDFFF then
				return 0x10000 + (value - 0xD800) * 0x400 + (low - 0xDC00)
			end
			p.pos = save
		end
		return value
	elseif c == "c" then
		local letter = peek(p)
		if letter and ((letter >= 0x41 and letter <= 0x5A) or (letter >= 0x61 and letter <= 0x7A)) then
			p.pos = p.pos + 1
			return letter % 32
		end
		parse_error(p, "invalid \\c escape")
	elseif is_digit(cp) and cp ~= 0x30 and not in_class then
		local n = cp - 0x30
		while is_digit(peek(p) or 0) do
			n = n * 10 + peek(p) - 0x30
			p.pos = p.pos + 1
		end
		return { node = { type = "backref", group = n } }
	elseif syntax_chars[cp] or (in_class and cp == 0x2D) then
		return cp
	end
	parse_error(p, "unsupported escape \\" .. vim.fn.nr2char(cp))
end

local parse_alternation

local function parse_class(p)
	local negate = eat(p, 0x5E)
	local ranges, tests = {}, {}
	local function class_atom()
		local cp = peek(p)
		if cp == nil then
			parse_error(p, "unterminated character class")
		end
		p.pos = p.pos + 1
		if cp == 0x5C then
			return parse_escape(p, true)
		end
		return cp
	end
	while not eat(p, 0x5D) do
		local first = class_atom()
		if type(first) == "table" then
			tests[#tests + 1] = first.test
		elseif peek(p) == 0x2D and peek(p, 1) ~= nil and peek(p, 1) ~= 0x5D then
			p.pos = p.pos + 1
			local last = class_atom()
			if type(last) == "table" then
				parse_error(p, "class escape in a range")
			end
			if last < first then
				parse_error(p, "range out of order")
			end
			ranges[#ranges + 1] = { first, last }
		else
			ranges[#ranges + 1] = { first, first }
		end
	end
	local function raw(cp)
		for _, range in ipairs(ranges) do
			if cp >= range[1] and cp <= range[2] then
				return true
			end
		end
		for _, test in ipairs(tests) do
			if test(cp) then
				return true
			end
		end
		return false
	end
	-- `iu`: the class matches when any character case-equivalent to the input is
	-- in it (ES CharacterSetMatcher compares canonicalized members)
	local function test(cp)
		local found = raw(cp)
		if not found then
			local equivalents = members_of[canon(cp)]
			if equivalents then
				for _, other in ipairs(equivalents) do
					if other ~= cp and raw(other) then
						found = true
						break
					end
				end
			end
		end
		if negate then
			return not found
		end
		return found
	end
	-- `[^]` matches every code point
	return { type = "char", test = test, any = negate and #ranges == 0 and #tests == 0 }
end

local function parse_quantifier(p)
	local cp = peek(p)
	local min, max
	if cp == 0x2A then
		min, max = 0, nil
		p.pos = p.pos + 1
	elseif cp == 0x2B then
		min, max = 1, nil
		p.pos = p.pos + 1
	elseif cp == 0x3F then
		min, max = 0, 1
		p.pos = p.pos + 1
	elseif cp == 0x7B then
		local save = p.pos
		p.pos = p.pos + 1
		local function int()
			local n
			while is_digit(peek(p) or 0) do
				n = (n or 0) * 10 + peek(p) - 0x30
				p.pos = p.pos + 1
			end
			return n
		end
		min = int()
		if min and eat(p, 0x2C) then
			max = int()
		elseif min then
			max = min
		end
		if not min or not eat(p, 0x7D) then
			p.pos = save
			parse_error(p, "lone '{' is invalid with the u flag")
		end
		if max and max < min then
			parse_error(p, "numbers out of order in quantifier")
		end
	else
		return nil
	end
	local greedy = not eat(p, 0x3F)
	return min, max, greedy
end

local function parse_term(p)
	local cp = peek(p)
	local node
	if cp == 0x5E then
		p.pos = p.pos + 1
		return { type = "start" }
	elseif cp == 0x24 then
		p.pos = p.pos + 1
		return { type = "end" }
	elseif cp == 0x2E then
		p.pos = p.pos + 1
		node = {
			type = "char",
			dot = true,
			test = function(c)
				return not is_line_terminator(c)
			end,
		}
	elseif cp == 0x28 then
		p.pos = p.pos + 1
		if eat(p, 0x3F) then
			if eat(p, 0x3A) then
				node = { type = "group", body = parse_alternation(p) }
			elseif eat(p, 0x3D) or eat(p, 0x21) then
				local negate = p.cps[p.pos - 1] == 0x21
				local body = parse_alternation(p)
				if not eat(p, 0x29) then
					parse_error(p, "unterminated lookahead")
				end
				-- `u`: lookaheads can't be quantified
				return { type = "look", negate = negate, body = body }
			else
				parse_error(p, "lookbehind and named groups are not supported")
			end
		else
			p.groups = p.groups + 1
			local index = p.groups
			node = { type = "group", capture = index, body = parse_alternation(p) }
		end
		if not eat(p, 0x29) then
			parse_error(p, "unterminated group")
		end
	elseif cp == 0x5B then
		p.pos = p.pos + 1
		node = parse_class(p)
	elseif cp == 0x5C then
		p.pos = p.pos + 1
		local escaped = parse_escape(p, false)
		if type(escaped) == "number" then
			local folded = canon(escaped)
			node = {
				type = "char",
				literal = folded,
				test = function(c)
					return canon(c) == folded
				end,
			}
		elseif escaped.test then
			node = { type = "char", test = escaped.test }
		elseif escaped.node.type == "boundary" then
			return escaped.node
		else
			node = escaped.node
		end
	elseif cp == 0x2A or cp == 0x2B or cp == 0x3F or cp == 0x7B or cp == 0x29 or cp == 0x5D or cp == 0x7D then
		parse_error(p, "nothing to repeat or unbalanced bracket")
	else
		p.pos = p.pos + 1
		local folded = canon(cp)
		node = {
			type = "char",
			literal = folded,
			test = function(c)
				return canon(c) == folded
			end,
		}
	end
	local min, max, greedy = parse_quantifier(p)
	if min then
		return { type = "repeat", body = node, min = min, max = max, greedy = greedy }
	end
	return node
end

local function count_groups(node, acc)
	acc = acc or {}
	if node.type == "group" and node.capture then
		acc[#acc + 1] = node.capture
	end
	for _, child in ipairs(node.items or node.alternatives or {}) do
		count_groups(child, acc)
	end
	if node.body then
		count_groups(node.body, acc)
	end
	return acc
end

local function parse_sequence(p)
	local items = {}
	while true do
		local cp = peek(p)
		if cp == nil or cp == 0x7C or cp == 0x29 then
			break
		end
		items[#items + 1] = parse_term(p)
	end
	return { type = "sequence", items = items }
end

parse_alternation = function(p)
	local alternatives = { parse_sequence(p) }
	while eat(p, 0x7C) do
		alternatives[#alternatives + 1] = parse_sequence(p)
	end
	if #alternatives == 1 then
		return alternatives[1]
	end
	return { type = "alternation", alternatives = alternatives }
end

-- Matchers have the shape `m(state, index, continuation) -> boolean`, where
-- `index` is a 1-based code point position and `continuation(index)` matches
-- the rest of the pattern. Captures live in `state.caps` as start/end pairs
-- and are restored whenever a branch fails.

local compile

local function compile_sequence(items)
	if #items == 0 then
		return function(_, i, k)
			return k(i)
		end
	end
	local matchers = {}
	for index, item in ipairs(items) do
		matchers[index] = compile(item)
	end
	local count = #matchers
	return function(st, i, k)
		local function step(n, j)
			if n > count then
				return k(j)
			end
			return matchers[n](st, j, function(next)
				return step(n + 1, next)
			end)
		end
		return step(1, i)
	end
end

local function compile_repeat(node)
	local min, max, greedy = node.min, node.max, node.greedy
	if max == 0 then
		return function(_, i, k)
			return k(i)
		end
	end
	if node.body.type == "char" then
		-- a single-character body can't capture or match empty, so the whole
		-- run is found iteratively, then backtracked one character at a time
		local test = node.body.test
		if greedy then
			return function(st, i, k)
				local cps, n = st.cps, st.n
				local j, count = i, 0
				while (max == nil or count < max) and j <= n and test(cps[j]) do
					j = j + 1
					count = count + 1
				end
				while count >= min do
					if k(j) then
						return true
					end
					j = j - 1
					count = count - 1
				end
				return false
			end
		end
		return function(st, i, k)
			local cps, n = st.cps, st.n
			local j, count = i, 0
			while count < min do
				if j <= n and test(cps[j]) then
					j = j + 1
					count = count + 1
				else
					return false
				end
			end
			while true do
				if k(j) then
					return true
				end
				if (max ~= nil and count >= max) or j > n or not test(cps[j]) then
					return false
				end
				j = j + 1
				count = count + 1
			end
		end
	end
	local body = compile(node.body)
	local groups = count_groups(node.body)
	-- ES RepeatMatcher
	local function repeat_from(st, i, k, count)
		if max ~= nil and count >= max then
			return k(i)
		end
		local function iterate()
			local caps = st.caps
			local saved = {}
			for index, group in ipairs(groups) do
				saved[index * 2 - 1], saved[index * 2] = caps[group * 2 - 1], caps[group * 2]
				caps[group * 2 - 1], caps[group * 2] = nil, nil
			end
			local matched = body(st, i, function(j)
				if count >= min and j == i then
					return false
				end
				return repeat_from(st, j, k, count + 1)
			end)
			if not matched then
				for index, group in ipairs(groups) do
					caps[group * 2 - 1], caps[group * 2] = saved[index * 2 - 1], saved[index * 2]
				end
			end
			return matched
		end
		if count < min then
			return iterate()
		end
		if greedy then
			return iterate() or k(i)
		end
		return k(i) or iterate()
	end
	return function(st, i, k)
		return repeat_from(st, i, k, 0)
	end
end

compile = function(node)
	local kind = node.type
	if kind == "char" then
		local test = node.test
		return function(st, i, k)
			if i <= st.n and test(st.cps[i]) then
				return k(i + 1)
			end
			return false
		end
	elseif kind == "sequence" then
		return compile_sequence(node.items)
	elseif kind == "alternation" then
		local matchers = {}
		for index, alternative in ipairs(node.alternatives) do
			matchers[index] = compile(alternative)
		end
		return function(st, i, k)
			for _, m in ipairs(matchers) do
				if m(st, i, k) then
					return true
				end
			end
			return false
		end
	elseif kind == "group" then
		local body = compile(node.body)
		local capture = node.capture
		if not capture then
			return body
		end
		local s, e = capture * 2 - 1, capture * 2
		return function(st, i, k)
			return body(st, i, function(j)
				local caps = st.caps
				local old_s, old_e = caps[s], caps[e]
				caps[s], caps[e] = i, j
				if k(j) then
					return true
				end
				caps[s], caps[e] = old_s, old_e
				return false
			end)
		end
	elseif kind == "repeat" then
		return compile_repeat(node)
	elseif kind == "start" then
		return function(_, i, k)
			return i == 1 and k(i)
		end
	elseif kind == "end" then
		return function(st, i, k)
			return i == st.n + 1 and k(i)
		end
	elseif kind == "boundary" then
		local negate = node.negate
		return function(st, i, k)
			local before = i > 1 and is_word(st.cps[i - 1])
			local after = i <= st.n and is_word(st.cps[i])
			if (before ~= after) ~= negate then
				return k(i)
			end
			return false
		end
	elseif kind == "backref" then
		local s, e = node.group * 2 - 1, node.group * 2
		return function(st, i, k)
			local caps = st.caps
			local from, to = caps[s], caps[e]
			if from == nil then
				return k(i)
			end
			local length = to - from
			if i + length - 1 > st.n then
				return false
			end
			local cps = st.cps
			for offset = 0, length - 1 do
				if canon(cps[from + offset]) ~= canon(cps[i + offset]) then
					return false
				end
			end
			return k(i + length)
		end
	elseif kind == "look" then
		local body = compile(node.body)
		local negate = node.negate
		local groups = count_groups(node.body)
		return function(st, i, k)
			local caps = st.caps
			local saved = {}
			for index, group in ipairs(groups) do
				saved[index * 2 - 1], saved[index * 2] = caps[group * 2 - 1], caps[group * 2]
			end
			local function restore()
				for index, group in ipairs(groups) do
					caps[group * 2 - 1], caps[group * 2] = saved[index * 2 - 1], saved[index * 2]
				end
			end
			local matched = body(st, i, function()
				return true
			end)
			if negate then
				restore()
				return not matched and k(i)
			end
			if not matched then
				return false
			end
			if k(i) then
				return true
			end
			restore()
			return false
		end
	end
	error("arktype: unknown regex node " .. tostring(kind))
end

---@class arktype.Regex
---@field source string
---@field group_count integer
---@field matcher function

--- Compiles `source` as `new RegExp(source, "iu")` would.
---@param source string
---@return arktype.Regex
function M.compile(source)
	local cps = decode(source)
	local p = { cps = cps, pos = 1, groups = 0, source = source }
	local ast = parse_alternation(p)
	if p.pos <= #cps then
		parse_error(p, "unmatched ')'")
	end
	local function check_backrefs(node)
		if node.type == "backref" and node.group > p.groups then
			-- `u`: a backreference to a group that doesn't exist is a SyntaxError
			parse_error(p, "invalid backreference \\" .. node.group)
		end
		for _, child in ipairs(node.items or node.alternatives or {}) do
			check_backrefs(child)
		end
		if node.body then
			check_backrefs(node.body)
		end
	end
	check_backrefs(ast)
	local items = ast.type == "sequence" and ast.items or { ast }
	-- runs of literal characters every match must contain, checked before
	-- matching so most rules reject most messages without backtracking
	local required, run = {}, {}
	for _, item in ipairs(items) do
		if item.type == "char" and item.literal then
			run[#run + 1] = item.literal
		else
			if #run > 0 then
				required[#required + 1] = run
			end
			run = {}
		end
	end
	if #run > 0 then
		required[#required + 1] = run
	end
	local first = items[1]
	local leading
	if first and first.type == "start" then
		leading = "anchored"
	elseif first and first.type == "repeat" and first.min == 0 and first.max == nil then
		-- if `.*X` fails from some index, it fails from every later index on
		-- the same line (the `.*` from the earlier index can consume up to any
		-- later one), and `[^]*X` fails from every later index at all
		if first.body.any then
			leading = "all"
		elseif first.body.dot then
			leading = "line"
		end
	end
	return {
		source = source,
		group_count = p.groups,
		matcher = compile(ast),
		required = required,
		leading = leading,
	}
end

local function contains_run(folded, run)
	local n, m = #folded, #run
	for start = 1, n - m + 1 do
		local found = true
		for offset = 1, m do
			if folded[start + offset - 1] ~= run[offset] then
				found = false
				break
			end
		end
		if found then
			return true
		end
	end
	return false
end

--- Like `RegExp.prototype.exec` without the `g` flag: the first match, as a
--- list of `group_count + 1` entries (index 0 is the whole match), with `nil`
--- for a group that didn't participate. Returns nil when nothing matches.
---@param re arktype.Regex
---@param subject string
---@return table<integer, string|nil>?
function M.exec(re, subject)
	local cps, offsets = decode(subject)
	local n = #cps
	if #re.required > 0 then
		local folded = {}
		for index = 1, n do
			folded[index] = canon(cps[index])
		end
		for _, run in ipairs(re.required) do
			if not contains_run(folded, run) then
				return nil
			end
		end
	end
	local st = { cps = cps, n = n, caps = {} }
	local match_start, match_end
	local start = 1
	while start <= n + 1 do
		st.caps = {}
		if
			re.matcher(st, start, function(j)
				match_start, match_end = start, j
				return true
			end)
		then
			local result = { [0] = subject:sub(offsets[match_start], offsets[match_end] - 1) }
			for group = 1, re.group_count do
				local s, e = st.caps[group * 2 - 1], st.caps[group * 2]
				if s ~= nil then
					result[group] = subject:sub(offsets[s], offsets[e] - 1)
				end
			end
			return result
		end
		if re.leading == "anchored" or re.leading == "all" then
			return nil
		elseif re.leading == "line" then
			while start <= n and not is_line_terminator(cps[start]) do
				start = start + 1
			end
		end
		start = start + 1
	end
	return nil
end

return M
