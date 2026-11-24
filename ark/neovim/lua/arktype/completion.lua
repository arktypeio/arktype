-- Completions while typing inside strings, like the extension's
-- `"editor.quickSuggestions": { "strings": "on" }`, for Neovim's built-in
-- LSP completion. `vim.lsp.completion.enable(..., { autotrigger = true })`
-- only triggers on a server's trigger characters, so typing `"string | nu`
-- shows nothing until this asks for completions on every keyword character
-- typed inside a string.
--
-- blink.cmp and nvim-cmp already complete in strings as you type; this is
-- only for buffers where you enable the built-in completion.

local M = {}

local string_nodes = {
	string = true,
	string_fragment = true,
	template_string = true,
	escape_sequence = true,
}

--- Whether the character before the cursor (or before `pos`, a 0-based row
--- and byte column) is in a string literal, by tree-sitter when the buffer
--- has a parser and by syntax groups otherwise.
---@param bufnr? integer
---@param pos? [integer, integer]
---@return boolean
function M.in_string(bufnr, pos)
	bufnr = bufnr or 0
	if not pos then
		local cursor = vim.api.nvim_win_get_cursor(0)
		pos = { cursor[1] - 1, cursor[2] }
	end
	-- the character before the cursor is the one being typed into
	local col = math.max(pos[2] - 1, 0)
	local parser = vim.treesitter.get_parser(bufnr, nil, { error = false })
	if parser then
		parser:parse({ pos[1], pos[1] + 1 })
		local range = { pos[1], col, pos[1], col }
		-- from the innermost language outward, since ArkType's own layer
		-- replaces the host's string node with definition tokens
		local tree = parser:language_for_range(range)
		while tree do
			local node = tree:named_node_for_range(range, { ignore_injections = true })
			while node do
				if string_nodes[node:type()] then
					return true
				end
				node = node:parent()
			end
			tree = tree:parent()
		end
		return false
	end
	local name = vim.fn.synIDattr(vim.fn.synIDtrans(vim.fn.synID(pos[1] + 1, col + 1, true)), "name")
	return name == "String"
end

local augroup

--- Triggers built-in LSP completion on each keyword character typed inside a
--- string in `bufnr`. Call it from the LspAttach callback that runs
--- `vim.lsp.completion.enable()`.
---@param bufnr? integer
function M.attach(bufnr)
	if bufnr == nil or bufnr == 0 then
		bufnr = vim.api.nvim_get_current_buf()
	end
	augroup = augroup or vim.api.nvim_create_augroup("arktype.completion", { clear = true })
	vim.api.nvim_clear_autocmds({ group = augroup, buffer = bufnr })
	vim.api.nvim_create_autocmd("InsertCharPre", {
		group = augroup,
		buffer = bufnr,
		callback = function()
			if vim.fn.pumvisible() == 1 or not vim.v.char:match("[%w_]") then
				return
			end
			-- the typed character isn't in the buffer until after this event
			vim.schedule(function()
				if
					vim.api.nvim_get_current_buf() == bufnr
					and vim.fn.mode():sub(1, 1) == "i"
					and vim.fn.pumvisible() == 0
					and M.in_string(bufnr)
				then
					vim.lsp.completion.get()
				end
			end)
		end,
	})
end

return M
