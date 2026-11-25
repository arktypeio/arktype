local h = require("helpers")
local lsp = require("arktype.lsp")
local completion = require("arktype.completion")

local exclude = "^(node:)?os$"

local function count(list, value)
	return #vim.tbl_filter(function(item)
		return item == value
	end, list)
end

return {
	{
		"adds the os exclusion to each server's own setting once, after the user's",
		function()
			h.eq(
				{ "^a$", exclude },
				lsp.ts_ls({ init_options = { preferences = { autoImportSpecifierExcludeRegexes = { "^a$" } } } }).init_options.preferences.autoImportSpecifierExcludeRegexes
			)
			h.eq({ exclude }, lsp.ts_ls(lsp.ts_ls()).init_options.preferences.autoImportSpecifierExcludeRegexes)
			local vtsls = lsp.vtsls().settings
			h.eq({ exclude }, vtsls.typescript.preferences.autoImportSpecifierExcludeRegexes)
			h.eq({ exclude }, vtsls.javascript.preferences.autoImportSpecifierExcludeRegexes)
			local tools = lsp.typescript_tools({
				settings = {
					tsserver_file_preferences = function()
						return { includeInlayParameterNameHints = "all" }
					end,
				},
			})
			h.eq(
				{ includeInlayParameterNameHints = "all", autoImportSpecifierExcludeRegexes = { exclude } },
				tools.settings.tsserver_file_preferences("typescript")
			)
		end,
	},
	{
		"setup() merges into vim.lsp.config without dropping the user's config",
		function()
			vim.lsp.config("ts_ls", {
				cmd = { "typescript-language-server", "--stdio" },
				init_options = { preferences = { autoImportSpecifierExcludeRegexes = { "^a$" }, quotePreference = "double" } },
			})
			lsp.setup()
			lsp.setup()
			local config = vim.lsp.config.ts_ls
			h.eq({ "typescript-language-server", "--stdio" }, config.cmd)
			h.eq("double", config.init_options.preferences.quotePreference)
			h.eq({ "^a$", exclude }, config.init_options.preferences.autoImportSpecifierExcludeRegexes)
			h.eq({ exclude }, vim.lsp.config.vtsls.settings.typescript.preferences.autoImportSpecifierExcludeRegexes)
		end,
	},
	{
		"built-in completion triggers on keyword characters typed in strings only",
		function()
			-- a child Nvim, so typed keys go through its real input loop
			local nvim = vim.fn.jobstart({ "nvim", "--embed", "--clean", "--headless" }, { rpc = true })
			local function lua(code, ...)
				return vim.rpcrequest(nvim, "nvim_exec_lua", code, { ... })
			end
			lua(
				[[
				local root, deps = ...
				vim.opt.rtp:prepend(root)
				vim.opt.rtp:prepend(deps .. "/site")
				package.path = root .. "/test/?.lua;" .. package.path
				_G.received = {}
				local bufnr = vim.api.nvim_get_current_buf()
				vim.bo[bufnr].filetype = "typescript"
				vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, { 'const T = type("")', "const x = 1" })
				vim.treesitter.start(bufnr, "typescript")
				local client_id = assert(vim.lsp.start({ name = "fake", cmd = require("fake_server")(_G.received) }))
				vim.lsp.completion.enable(true, client_id, bufnr, { autotrigger = true })
				require("arktype.completion").attach(bufnr)
				]],
				h.repo_root .. "/ark/neovim",
				assert(os.getenv("ARKTYPE_TEST_DEPS"))
			)
			local function completions()
				return lua([[
					return #vim.tbl_filter(function(method)
						return method == "textDocument/completion"
					end, _G.received)
				]])
			end

			-- typing in "" asks for completions
			lua([[vim.api.nvim_win_set_cursor(0, { 1, 16 })]])
			vim.rpcrequest(nvim, "nvim_input", "is")
			assert(vim.wait(2000, function()
				return completions() > 0
			end), "no completion request from typing in a string")
			vim.rpcrequest(nvim, "nvim_input", "<Esc>")

			-- typing outside a string doesn't
			local before = completions()
			lua([[vim.api.nvim_win_set_cursor(0, { 2, 10 })]])
			vim.rpcrequest(nvim, "nvim_input", "a2<Esc>")
			vim.wait(300)
			h.eq(before, completions(), "completion requested outside a string")

			h.eq(true, lua([[return require("arktype.completion").in_string(0, { 0, 17 })]]))
			h.eq(false, lua([[return require("arktype.completion").in_string(0, { 1, 11 })]]))
			vim.fn.jobstop(nvim)
		end,
	},
}
