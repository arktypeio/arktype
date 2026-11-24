-- The `arktype` tree-sitter parser: building it from the grammar shipped with
-- this plugin, and registering it with nvim-treesitter's `main` branch.
--
-- Highlighting itself needs no code: queries/arktype/highlights.scm and the
-- `; extends` injections under queries/{typescript,tsx,javascript} are found
-- on 'runtimepath' by Neovim's own vim.treesitter. Svelte, Vue, Astro and
-- Markdown inject TypeScript or JavaScript, so ArkType reaches them through
-- those.

local M = {}

M.lang = "arktype"

local plugin_root = vim.fs.dirname(vim.fs.dirname(vim.fs.dirname(vim.fs.abspath(debug.getinfo(1, "S").source:sub(2)))))
M.plugin_root = plugin_root

--- The grammar directory (with `src/parser.c`): `ark/tree-sitter` beside this
--- plugin in the ArkType repo, or `tree-sitter/` inside a standalone copy.
---@return string?
function M.grammar_dir()
	for _, candidate in ipairs({
		vim.fs.joinpath(plugin_root, "tree-sitter"),
		vim.fs.joinpath(vim.fs.dirname(plugin_root), "tree-sitter"),
	}) do
		if vim.uv.fs_stat(vim.fs.joinpath(candidate, "src", "parser.c")) then
			return candidate
		end
	end
end

--- Where `build()` writes the parser by default: a `parser/` directory
--- Neovim searches, since stdpath("data")/site is on 'runtimepath'.
---@return string
function M.default_parser_path()
	local ext = vim.fn.has("win32") == 1 and "dll" or "so"
	return vim.fs.joinpath(vim.fn.stdpath("data"), "site", "parser", "arktype." .. ext)
end

---@class arktype.treesitter.BuildOpts
---@field output? string where to write the parser (default `default_parser_path()`)
---@field compiler? string a C compiler to use instead of `tree-sitter build`

--- Compiles the bundled grammar. Uses the `tree-sitter` CLI when it's on
--- PATH, otherwise $CC or `cc` directly.
---@param opts? arktype.treesitter.BuildOpts
---@return string path the compiled parser
function M.build(opts)
	opts = opts or {}
	local grammar = M.grammar_dir()
	if not grammar then
		error("arktype: the grammar's src/parser.c wasn't found beside " .. plugin_root, 0)
	end
	local output = opts.output or M.default_parser_path()
	vim.fn.mkdir(vim.fs.dirname(output), "p")
	-- build to a temporary name, then rename, so a Neovim that already
	-- loaded the old parser doesn't crash reading a half-written file
	local partial = output .. ".tmp"
	local cmd
	if not opts.compiler and vim.fn.executable("tree-sitter") == 1 then
		cmd = { "tree-sitter", "build", "-o", partial, grammar }
	else
		local cc = opts.compiler or os.getenv("CC") or "cc"
		local src = vim.fs.joinpath(grammar, "src")
		cmd = { cc, "-o", partial, "-shared", "-fPIC", "-O2", "-std=c11", "-I", src, vim.fs.joinpath(src, "parser.c") }
		if vim.uv.fs_stat(vim.fs.joinpath(src, "scanner.c")) then
			table.insert(cmd, vim.fs.joinpath(src, "scanner.c"))
		end
	end
	local result = vim.system(cmd, { text = true }):wait()
	if result.code ~= 0 then
		error(("arktype: `%s` failed:\n%s%s"):format(table.concat(cmd, " "), result.stdout or "", result.stderr or ""), 0)
	end
	assert(vim.uv.fs_rename(partial, output))
	return output
end

--- Whether Neovim can load the `arktype` parser.
---@return boolean
function M.has_parser()
	-- since 0.11 a missing parser returns nil and an error rather than throwing
	local ok, loaded = pcall(vim.treesitter.language.add, M.lang)
	return ok and loaded == true
end

local registered = false

--- Tells nvim-treesitter (`main` branch) where the grammar lives, so
--- `:TSInstall arktype` and `:TSUpdate` work too.
function M.register_nvim_treesitter()
	if registered then
		return
	end
	registered = true
	local function add()
		local ok, parsers = pcall(require, "nvim-treesitter.parsers")
		if ok and type(parsers) == "table" then
			parsers.arktype = {
				install_info = {
					url = "https://github.com/arktypeio/arktype",
					location = "ark/tree-sitter",
					branch = "main",
				},
			}
		end
	end
	add()
	vim.api.nvim_create_autocmd("User", { pattern = "TSUpdate", callback = add })
end

local function define_highlights()
	-- characters TextMate leaves unscoped inside a definition show in the
	-- default foreground, not the string color the host gives them
	vim.api.nvim_set_hl(0, "@none.arktype", { link = "Normal", default = true })
end

---@class arktype.treesitter.Config
---@field build? boolean build the parser when it's missing (default true)

---@param config? arktype.treesitter.Config
function M.setup(config)
	config = config or {}
	define_highlights()
	vim.api.nvim_create_autocmd("ColorScheme", {
		group = vim.api.nvim_create_augroup("arktype.treesitter", { clear = true }),
		callback = define_highlights,
	})
	M.register_nvim_treesitter()
	if config.build ~= false and not M.has_parser() and M.grammar_dir() then
		local ok, err = pcall(M.build)
		if not ok then
			vim.notify(err, vim.log.levels.WARN)
		end
	end
end

return M
