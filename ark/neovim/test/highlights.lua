-- Reads back what Neovim's tree-sitter highlighter shows for each character
-- of a buffer, in @editor-parity's span format
-- (ark/editor-conformance/highlighting/spans.ts).
--
-- The highlighter (runtime/lua/vim/treesitter/highlighter.lua) draws every
-- capture of every language tree as an extmark: a higher `priority` wins,
-- then the later tree in `for_each_tree` order (injections after their
-- host), then the later capture in `iter_captures` order. A capture whose
-- group has no color (`@spell`, an undefined group) changes nothing. This
-- replays that order per character and keeps the topmost colored capture.
local M = {}

local function before(a, b)
	for index = 1, #a do
		if a[index] ~= b[index] then
			return a[index] < b[index]
		end
	end
	return false
end

local function has_color(group)
	local hl = vim.api.nvim_get_hl(0, { name = group, link = false })
	return hl.fg ~= nil or hl.ctermfg ~= nil
end

---@class arktype.test.Cell
---@field capture string
---@field lang string
---@field key number[]

--- The topmost colored capture at every character, keyed `row` then byte
--- column, both 0-based.
---@param bufnr integer
---@return table<integer, table<integer, arktype.test.Cell>>
function M.cells(bufnr)
	local parser = assert(vim.treesitter.get_parser(bufnr))
	parser:parse(true)
	local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
	local cells = {}
	local subtree = 0
	local function paint(row, start_col, end_col, cell)
		local line = lines[row + 1] or ""
		end_col = math.min(end_col, #line)
		cells[row] = cells[row] or {}
		for col = start_col, end_col - 1 do
			local current = cells[row][col]
			if not current or not before(cell.key, current.key) then
				cells[row][col] = cell
			end
		end
	end
	parser:for_each_tree(function(tstree, tree)
		local lang = tree:lang()
		local query = vim.treesitter.query.get(lang, "highlights")
		if not query then
			return
		end
		subtree = subtree + 1
		local regions = tstree:included_ranges(true)
		local sequence = 0
		for id, node, metadata in query:iter_captures(tstree:root(), bufnr, 0, -1) do
			local name = query.captures[id]
			sequence = sequence + 1
			if not vim.startswith(name, "_") and has_color("@" .. name .. "." .. lang) then
				local priority = tonumber(metadata.priority or metadata[id] and metadata[id].priority)
					or vim.hl.priorities.treesitter
				if name == "nospell" then
					priority = priority + 1
				end
				local cell = { capture = name, lang = lang, key = { priority, subtree, sequence } }
				local range = vim.treesitter.get_range(node, bufnr, metadata[id])
				for _, region in ipairs(regions) do
					local sr, sc, er, ec = region[1], region[2], region[4], region[5]
					-- intersect the capture with the tree's region
					local r1, c1, r2, c2 = range[1], range[2], range[4], range[5]
					if r1 < sr or (r1 == sr and c1 < sc) then
						r1, c1 = sr, sc
					end
					if r2 > er or (r2 == er and c2 > ec) then
						r2, c2 = er, ec
					end
					if r1 < r2 or (r1 == r2 and c1 < c2) then
						for row = r1, r2 do
							local from = row == r1 and c1 or 0
							local to = row == r2 and c2 or math.huge
							paint(row, from, to, cell)
						end
					end
				end
			end
		end
	end)
	return cells
end

--- Maps a capture to a conformance category: its longest dot-separated
--- prefix that is a category, or the capture itself.
---@param capture string
---@param categories table<string, boolean>
function M.category(capture, categories)
	local name = capture
	while name do
		if categories[name] then
			return name
		end
		name = name:match("^(.*)%.[^.]+$")
	end
	return capture
end

--- Spans for the characters `lang`'s layer colors, the way check.ts reads a
--- target's output: maximal runs of non-whitespace characters on one line
--- sharing a category, with UTF-16 columns.
---@param bufnr integer
---@param lang string
---@param categories table<string, boolean>
function M.spans(bufnr, lang, categories)
	local cells = M.cells(bufnr)
	local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
	local spans = {}
	for row, line in ipairs(lines) do
		row = row - 1
		local open
		local col = 0
		while col <= #line do
			local char_end = col < #line and (vim.str_utf_end(line, col + 1) + col + 1) or col + 1
			local char = line:sub(col + 1, char_end)
			local cell = cells[row] and cells[row][col]
			local category
			if col < #line and not char:match("^%s$") and cell and cell.lang == lang then
				category = M.category(cell.capture, categories)
			end
			if open and category == open.category then
				open.text = open.text .. char
				open.length = vim.str_utfindex(line, "utf-16", char_end) - open.column
			else
				if open then
					spans[#spans + 1] = open
				end
				open = nil
				if category then
					local column = vim.str_utfindex(line, "utf-16", col)
					open = {
						line = row,
						column = column,
						length = vim.str_utfindex(line, "utf-16", char_end) - column,
						text = char,
						category = category,
					}
				end
			end
			col = char_end
		end
	end
	return spans
end

return M
