-- Auto-import settings: TypeScript offers Node's `os` module's `type` before
-- ArkType's, so the extension's docs exclude it with the tsserver preference
-- `autoImportSpecifierExcludeRegexes` (VS Code's
-- `typescript.preferences.autoImportSpecifierExcludeRegexes`).
-- Each function returns the server's config with the exclusion appended to
-- whatever list it already has.

local M = {}

M.exclude = "^(node:)?os$"

local function with_exclusion(list)
	list = vim.deepcopy(list or {})
	if not vim.tbl_contains(list, M.exclude) then
		list[#list + 1] = M.exclude
	end
	return list
end

local function at(tbl, ...)
	for _, key in ipairs({ ... }) do
		if type(tbl) ~= "table" then
			return nil
		end
		tbl = tbl[key]
	end
	return tbl
end

--- vtsls reads VS Code's settings, under `settings.typescript` and
--- `settings.javascript`.
---@param config? table the current config, e.g. `vim.lsp.config.vtsls`
---@return table
function M.vtsls(config)
	local patch = { settings = {} }
	for _, language in ipairs({ "typescript", "javascript" }) do
		patch.settings[language] = {
			preferences = {
				autoImportSpecifierExcludeRegexes = with_exclusion(
					at(config, "settings", language, "preferences", "autoImportSpecifierExcludeRegexes")
				),
			},
		}
	end
	return patch
end

--- typescript-language-server (`ts_ls`) passes `init_options.preferences`
--- to tsserver.
---@param config? table the current config, e.g. `vim.lsp.config.ts_ls`
---@return table
function M.ts_ls(config)
	return {
		init_options = {
			preferences = {
				autoImportSpecifierExcludeRegexes = with_exclusion(
					at(config, "init_options", "preferences", "autoImportSpecifierExcludeRegexes")
				),
			},
		},
	}
end

--- typescript-tools.nvim's `settings.tsserver_file_preferences`, for its
--- `setup()`.
---@param opts? table the options you pass to `require("typescript-tools").setup()`
---@return table opts with the exclusion added
function M.typescript_tools(opts)
	opts = vim.deepcopy(opts or {})
	opts.settings = opts.settings or {}
	local preferences = opts.settings.tsserver_file_preferences
	if type(preferences) == "function" then
		opts.settings.tsserver_file_preferences = function(...)
			local resolved = vim.deepcopy(preferences(...) or {})
			resolved.autoImportSpecifierExcludeRegexes =
				with_exclusion(resolved.autoImportSpecifierExcludeRegexes)
			return resolved
		end
	else
		preferences = preferences or {}
		preferences.autoImportSpecifierExcludeRegexes =
			with_exclusion(preferences.autoImportSpecifierExcludeRegexes)
		opts.settings.tsserver_file_preferences = preferences
	end
	return opts
end

--- Adds the exclusion to `vim.lsp.config` for vtsls and ts_ls (Neovim 0.11+),
--- so it applies whenever either server is enabled with `vim.lsp.enable`.
--- Must run before the server starts; a running one keeps its settings.
function M.setup()
	if not vim.lsp.config then
		return
	end
	for _, name in ipairs({ "vtsls", "ts_ls" }) do
		vim.lsp.config(name, M[name](vim.lsp.config[name]))
	end
end

return M
