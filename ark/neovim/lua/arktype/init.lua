-- arktype.nvim: what ArkType's VS Code extension (ark/extension) does, for
-- Neovim. See README.md.
--
--   require("arktype").setup({
--     diagnostics = { follow_cursor = "closestProblem" }, -- or false
--     treesitter = { build = true },                       -- or false
--     lsp = true,                                          -- or false
--   })

local M = {}

---@class arktype.Config
---@field diagnostics? arktype.diagnostics.Config|false inline error summaries (ErrorLens)
---@field treesitter? arktype.treesitter.Config|false highlighting definitions
---@field lsp? boolean add the `os` auto-import exclusion to vtsls and ts_ls

---@param config? arktype.Config
function M.setup(config)
	config = config or {}
	if vim.fn.has("nvim-0.11") == 0 then
		vim.notify("arktype.nvim needs Neovim 0.11 or later", vim.log.levels.ERROR)
		return
	end
	if config.treesitter ~= false then
		require("arktype.treesitter").setup(config.treesitter or {})
	end
	if config.diagnostics ~= false then
		require("arktype.diagnostics").setup(config.diagnostics or {})
	else
		require("arktype.diagnostics").setup({ enabled = false })
	end
	if config.lsp ~= false then
		require("arktype.lsp").setup()
	end
	vim.api.nvim_create_user_command("ArkTypeBuild", function()
		local ok, result = pcall(require("arktype.treesitter").build)
		if ok then
			vim.notify("arktype: built " .. result .. "; restart Neovim to load it")
		else
			vim.notify(result, vim.log.levels.ERROR)
		end
	end, { desc = "Build the ArkType tree-sitter parser" })
end

return M
