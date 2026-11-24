-- Inline diagnostic summaries, ported from what the VS Code extension
-- (ark/extension) configures ErrorLens to show.
--
-- The message pipeline is ErrorLens 3.x's `prepareMessage`:
-- 1. `replace`: the first rule whose matcher (compiled as `new RegExp(matcher,
--    "iu")`) matches the message replaces it with the rule's `message`
--    template, `$0`..`$n` substituted in turn as JS string replacements.
-- 2. linebreaks (`[\n\r\t]+`) become one "⏎" (`errorLens.removeLinebreaks`).
-- 3. more than 500 code points are cut to 500 plus "…" (`errorLens.messageMaxChars`).
--
-- The renderer reproduces ErrorLens's placement: diagnostics are grouped by
-- start line, hints are left out (`errorLens.enabledDiagnosticLevels`), each
-- line shows its most severe problem at the end of the line, and with
-- `followCursor: "closestProblem"` only the line closest to the cursor does.

local regex = require("arktype.regex")

local M = {}

--- The `errorLens.replace` rules from ark/extension/package.json, verbatim
--- (the test suite checks they stay identical).
M.rules = {
	{
		matcher = [[.*'ErrorType<"?(.*?)"?>'.*$]],
		message = "$1",
	},
	{
		matcher = [[.*brand": "ErrorType"; (.*) \}'\.$]],
		message = "$1",
	},
	{
		matcher = [[.*'"(.*[\u200A\u200B])"'\.$]],
		message = "$1",
	},
	{
		matcher = [[^(?:Type|Argument of type) '"(.*)"' is not assignable to (?:parameter of )?type '("\1.*")'\.]],
		message = "$2",
	},
	{
		matcher = "[^]*\n([^\n]*)$",
		message = "$1",
	},
}

---@class arktype.diagnostics.Rule
---@field matcher string a JavaScript regex source, as in `errorLens.replace`
---@field message string the replacement, with `$0`..`$n` for the match and its groups

---@class arktype.diagnostics.CompiledRule
---@field regex arktype.Regex
---@field message string

---@type table<table, arktype.diagnostics.CompiledRule[]>
local compiled_cache = setmetatable({}, { __mode = "k" })

---@param rules arktype.diagnostics.Rule[]
---@return arktype.diagnostics.CompiledRule[]
local function compile_rules(rules)
	local compiled = compiled_cache[rules]
	if compiled then
		return compiled
	end
	compiled = {}
	for index, rule in ipairs(rules) do
		compiled[index] = { regex = regex.compile(rule.matcher), message = rule.message }
	end
	compiled_cache[rules] = compiled
	return compiled
end
M.compile_rules = compile_rules

local function find_plain(s, needle, init)
	return s:find(needle, init, true)
end

--- `subject.replace(new RegExp("\\$" + index, "gu"), value)`: every
--- occurrence of the literal `$<index>` becomes `value`, read as a JS
--- replacement pattern (`$$`, `$&`, `` $` `` and `$'` are special; the
--- searching regex has no groups, so `$1` and `$<` stay literal).
---@param subject string
---@param token string
---@param value string
---@return string
local function replace_all(subject, token, value)
	local pieces = {}
	local last = 1
	local start, finish = find_plain(subject, token, 1)
	if not start then
		return subject
	end
	while start do
		pieces[#pieces + 1] = subject:sub(last, start - 1)
		local expanded = {}
		local i = 1
		while i <= #value do
			local c = value:sub(i, i)
			local nextc = value:sub(i + 1, i + 1)
			if c == "$" and nextc == "$" then
				expanded[#expanded + 1] = "$"
				i = i + 2
			elseif c == "$" and nextc == "&" then
				expanded[#expanded + 1] = token
				i = i + 2
			elseif c == "$" and nextc == "`" then
				expanded[#expanded + 1] = subject:sub(1, start - 1)
				i = i + 2
			elseif c == "$" and nextc == "'" then
				expanded[#expanded + 1] = subject:sub(finish + 1)
				i = i + 2
			else
				local plain_end = value:find("$", i + 1, true)
				plain_end = plain_end and plain_end - 1 or #value
				expanded[#expanded + 1] = value:sub(i, plain_end)
				i = plain_end + 1
			end
		end
		pieces[#pieces + 1] = table.concat(expanded)
		last = finish + 1
		start, finish = find_plain(subject, token, last)
	end
	pieces[#pieces + 1] = subject:sub(last)
	return table.concat(pieces)
end

--- ErrorLens's template substitution: `$0`, then `$1`, ... each replaced in
--- the result of the previous step. A group that didn't participate in the
--- match is substituted as the string "undefined", as JS does.
---@param template string
---@param match table<integer, string|nil>
---@param group_count integer
---@return string
function M.substitute(template, match, group_count)
	local message = template
	for index = 0, group_count do
		local value = match[index]
		if value == nil then
			value = "undefined"
		end
		message = replace_all(message, "$" .. index, value)
	end
	return message
end

--- Applies the first matching rule to `message`, as ErrorLens's `replace` does.
---@param message string
---@param rules? arktype.diagnostics.Rule[] defaults to the extension's rules
---@return string rewritten
---@return integer? rule the 1-based index of the rule that matched
function M.rewrite(message, rules)
	if message == nil or message == "" then
		return ""
	end
	for index, rule in ipairs(compile_rules(rules or M.rules)) do
		local match = regex.exec(rule.regex, message)
		if match then
			return M.substitute(rule.message, match, rule.regex.group_count), index
		end
	end
	return message
end

---@class arktype.diagnostics.InlineOpts
---@field remove_linebreaks? boolean default true
---@field linebreak_symbol? string default "⏎"
---@field max_chars? integer default 500

--- ErrorLens's `removeLinebreaks` and `messageMaxChars`.
---@param message string
---@param opts? arktype.diagnostics.InlineOpts
---@return string
function M.inline(message, opts)
	-- not a table when called as inline(rewrite(message)), whose second
	-- result is the rule index
	if type(opts) ~= "table" then
		opts = {}
	end
	if opts.remove_linebreaks ~= false then
		message = message:gsub("[\n\r\t]+", opts.linebreak_symbol or "⏎")
	end
	local max = opts.max_chars or 500
	local cps, offsets = regex.decode(message)
	if #cps > max then
		message = message:sub(1, offsets[max + 1] - 1) .. "…"
	end
	return message
end

---@class arktype.diagnostics.Config: arktype.diagnostics.InlineOpts
---@field enabled? boolean show inline summaries (default true)
---@field display? "lens"|"virtual_text"|"virtual_lines" how to show them (default "lens")
---@field follow_cursor? "closestProblem"|"allLines"|"activeLine"|"allLinesExceptActive" `errorLens.followCursor` (default "closestProblem")
---@field follow_cursor_more? integer `errorLens.followCursorMore` (default 0)
---@field severities? vim.diagnostic.Severity[] `errorLens.enabledDiagnosticLevels` (default error, warning, info)
---@field rules? arktype.diagnostics.Rule[] `errorLens.replace` (default the extension's)
---@field margin? string text between the line and the message (default "    ", ErrorLens's "4ch")

---@type arktype.diagnostics.Config
M.defaults = {
	enabled = true,
	display = "lens",
	follow_cursor = "closestProblem",
	follow_cursor_more = 0,
	severities = {
		vim.diagnostic.severity.ERROR,
		vim.diagnostic.severity.WARN,
		vim.diagnostic.severity.INFO,
	},
	rules = M.rules,
	remove_linebreaks = true,
	linebreak_symbol = "⏎",
	max_chars = 500,
	margin = "    ",
}

---@type arktype.diagnostics.Config
M.config = vim.deepcopy(M.defaults)

--- The text ErrorLens would show for a message, with the current config.
---@param message string
---@return string
function M.prepare(message)
	local config = M.config
	return M.inline(M.rewrite(message, config.rules), config)
end

--- A `format` function for `vim.diagnostic.config()`'s `virtual_text`,
--- `virtual_lines` or `float`.
---@param diagnostic vim.Diagnostic
---@return string
function M.format(diagnostic)
	return M.prepare(diagnostic.message)
end

M.ns = vim.api.nvim_create_namespace("arktype.diagnostics")

local severity_hl = {
	[vim.diagnostic.severity.ERROR] = "ArkTypeLensError",
	[vim.diagnostic.severity.WARN] = "ArkTypeLensWarn",
	[vim.diagnostic.severity.INFO] = "ArkTypeLensInfo",
	[vim.diagnostic.severity.HINT] = "ArkTypeLensHint",
}

local function define_highlights()
	for _, name in ipairs({ "Error", "Warn", "Info", "Hint" }) do
		vim.api.nvim_set_hl(
			0,
			"ArkTypeLens" .. name,
			{ link = "DiagnosticVirtualText" .. name, default = true }
		)
	end
end

--- ErrorLens's `groupDiagnosticsByLine`: problems keyed by start line, each
--- line's list stably sorted by severity (error first).
---@param diagnostics vim.Diagnostic[]
---@param severities table<integer, boolean>
---@return table<integer, vim.Diagnostic[]> by_line
---@return integer[] lines ascending
function M.group_by_line(diagnostics, severities)
	local by_line, lines = {}, {}
	for _, diagnostic in ipairs(diagnostics) do
		if severities[diagnostic.severity] then
			local line = diagnostic.lnum
			if not by_line[line] then
				by_line[line] = {}
				lines[#lines + 1] = line
			end
			table.insert(by_line[line], diagnostic)
		end
	end
	table.sort(lines)
	for _, line in ipairs(lines) do
		local list = by_line[line]
		local order = {}
		for index, diagnostic in ipairs(list) do
			order[diagnostic] = index
		end
		table.sort(list, function(a, b)
			if a.severity ~= b.severity then
				return a.severity < b.severity
			end
			return order[a] < order[b]
		end)
	end
	return by_line, lines
end

--- The lines ErrorLens renders a message on for a cursor on `cursor_line`.
---@param lines integer[] lines with problems, ascending
---@param cursor_line integer 0-based
---@param mode string `follow_cursor`
---@param more integer `follow_cursor_more`
---@return table<integer, boolean>
function M.visible_lines(lines, cursor_line, mode, more)
	local visible = {}
	if mode == "allLines" then
		for _, line in ipairs(lines) do
			visible[line] = true
		end
	elseif mode == "activeLine" then
		for _, line in ipairs(lines) do
			if line >= cursor_line - more and line <= cursor_line + more then
				visible[line] = true
			end
		end
	elseif mode == "allLinesExceptActive" then
		for _, line in ipairs(lines) do
			if line ~= cursor_line then
				visible[line] = true
			end
		end
	else
		-- closestProblem: a stable sort by distance (JS sorts are stable and
		-- the keys start ascending, so ties go to the line above)
		local sorted = {}
		for index, line in ipairs(lines) do
			sorted[index] = { line = line, index = index }
		end
		table.sort(sorted, function(a, b)
			local da, db = math.abs(cursor_line - a.line), math.abs(cursor_line - b.line)
			if da ~= db then
				return da < db
			end
			return a.index < b.index
		end)
		for index = 1, math.min(#sorted, more + 1) do
			visible[sorted[index].line] = true
		end
	end
	return visible
end

local function cursor_line_for(bufnr)
	local win = vim.api.nvim_get_current_win()
	if vim.api.nvim_win_get_buf(win) ~= bufnr then
		win = vim.fn.bufwinid(bufnr)
		if win == -1 then
			return 0
		end
	end
	return vim.api.nvim_win_get_cursor(win)[1] - 1
end

--- Draws the summaries for `bufnr` from every namespace's diagnostics.
---@param bufnr integer
function M.render(bufnr)
	if not vim.api.nvim_buf_is_valid(bufnr) then
		return
	end
	vim.api.nvim_buf_clear_namespace(bufnr, M.ns, 0, -1)
	local config = M.config
	if not config.enabled or config.display ~= "lens" then
		return
	end
	if vim.diagnostic.is_enabled and not vim.diagnostic.is_enabled({ bufnr = bufnr }) then
		return
	end
	local severities = {}
	for _, severity in ipairs(config.severities) do
		severities[severity] = true
	end
	local by_line, lines = M.group_by_line(vim.diagnostic.get(bufnr), severities)
	if #lines == 0 then
		return
	end
	local visible = M.visible_lines(
		lines,
		cursor_line_for(bufnr),
		config.follow_cursor,
		config.follow_cursor_more
	)
	local line_count = vim.api.nvim_buf_line_count(bufnr)
	for _, line in ipairs(lines) do
		if visible[line] and line < line_count then
			local diagnostic = by_line[line][1]
			vim.api.nvim_buf_set_extmark(bufnr, M.ns, line, 0, {
				virt_text = {
					{ config.margin, "" },
					{ M.format(diagnostic), severity_hl[diagnostic.severity] },
				},
				virt_text_pos = "eol",
				hl_mode = "combine",
				priority = 200,
			})
		end
	end
end

local augroup

--- Applies `config` (merged over the defaults) and starts or stops showing
--- summaries.
---@param config? arktype.diagnostics.Config
function M.setup(config)
	M.config = vim.tbl_deep_extend("force", vim.deepcopy(M.defaults), config or {})
	-- lists replace rather than merge
	if config and config.rules then
		M.config.rules = config.rules
	end
	if config and config.severities then
		M.config.severities = config.severities
	end
	define_highlights()
	augroup = vim.api.nvim_create_augroup("arktype.diagnostics", { clear = true })
	for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
		if vim.api.nvim_buf_is_loaded(bufnr) then
			vim.api.nvim_buf_clear_namespace(bufnr, M.ns, 0, -1)
		end
	end
	if not M.config.enabled then
		return
	end
	vim.api.nvim_create_autocmd("ColorScheme", { group = augroup, callback = define_highlights })
	local display = M.config.display
	if display == "virtual_text" or display == "virtual_lines" then
		local current = vim.diagnostic.config()[display]
		local opts = type(current) == "table" and vim.deepcopy(current) or {}
		opts.format = M.format
		if display == "virtual_lines" and opts.current_line == nil then
			opts.current_line = M.config.follow_cursor ~= "allLines"
		end
		vim.diagnostic.config({ [display] = opts })
		return
	end
	vim.api.nvim_create_autocmd("DiagnosticChanged", {
		group = augroup,
		callback = function(args)
			M.render(args.buf)
		end,
	})
	if M.config.follow_cursor ~= "allLines" then
		vim.api.nvim_create_autocmd({ "CursorMoved", "CursorMovedI", "BufEnter" }, {
			group = augroup,
			callback = function(args)
				M.render(args.buf)
			end,
		})
	end
	for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
		if vim.api.nvim_buf_is_loaded(bufnr) then
			M.render(bufnr)
		end
	end
end

return M
