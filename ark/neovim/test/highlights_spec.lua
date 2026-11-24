local h = require("helpers")
local highlights = require("highlights")
local treesitter = require("arktype.treesitter")

local deps = os.getenv("ARKTYPE_TEST_DEPS") or ""
local conformance = os.getenv("ARKTYPE_CONFORMANCE_DIR") or (h.repo_root .. "/ark/editor-conformance")
local corpus = conformance .. "/highlighting/corpus"
local out_dir = h.data_dir .. "/highlights"
local grammar_dir = os.getenv("ARKTYPE_GRAMMAR_DIR")
if grammar_dir then
	treesitter.grammar_dir = function()
		return grammar_dir
	end
end

local categories

-- set up on first use, so filtering to other specs doesn't need the corpus
local function prepare()
	if categories then
		return
	end
	vim.opt.rtp:prepend(deps .. "/site")
	vim.opt.rtp:append(deps .. "/nvim-treesitter")
	vim.cmd("filetype on")
	-- nvim-treesitter's filetype-to-parser mappings (typescriptreact -> tsx, ...),
	-- which --clean doesn't source from a 'runtimepath' entry added this late
	dofile(deps .. "/nvim-treesitter/plugin/filetypes.lua")
	-- Neovim doesn't detect MDX, and nvim-treesitter has no MDX parser; the
	-- README's setup maps it to Markdown's, as is usual
	vim.filetype.add({ extension = { mdx = "mdx" } })
	vim.treesitter.language.register("markdown", "mdx")

	categories = {}
	for _, rule in ipairs(h.read_json(conformance .. "/highlighting/categories.json").rules) do
		categories[rule.category] = true
	end
	categories.none = true
end

local function open(file)
	local bufnr = vim.api.nvim_create_buf(true, false)
	vim.api.nvim_buf_set_name(bufnr, file)
	local text = assert(io.open(file, "rb")):read("*a")
	vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, vim.split(text, "\n", { plain = true }))
	local filetype = vim.filetype.match({ buf = bufnr, filename = file })
	local lang = assert(vim.treesitter.language.get_lang(filetype), "no parser for " .. tostring(filetype))
	vim.treesitter.start(bufnr, lang)
	return bufnr, lang
end

--- The fixtures differences/neovim.json skips, which check.ts rejects output for.
local function skipped()
	local path = conformance .. "/highlighting/differences/neovim.json"
	local result = {}
	if vim.uv.fs_stat(path) then
		for _, skip in ipairs(h.read_json(path).skipped or {}) do
			result[skip.fixture] = true
		end
	end
	return result
end

--- A line's ArkType spans as "text:category" words, ignoring columns.
local function line_spans(spans, line)
	local words = {}
	for _, span in ipairs(spans) do
		if span.line == line then
			words[#words + 1] = span.text .. ":" .. span.category
		end
	end
	return table.concat(words, " ")
end

local function find_line(lines, needle)
	for index, line in ipairs(lines) do
		if line:find(needle, 1, true) then
			return index - 1
		end
	end
	error("no line containing " .. needle)
end

local function fixture_spans(name)
	local bufnr = open(corpus .. "/" .. name)
	local spans = highlights.spans(bufnr, "arktype", categories)
	local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
	vim.api.nvim_buf_delete(bufnr, { force = true })
	return spans, lines
end

local function corpus_files()
	local files = {}
	for name, kind in vim.fs.dir(corpus) do
		if kind == "file" then
			files[#files + 1] = name
		end
	end
	table.sort(files)
	return files
end

return {
	{
		"builds the parser from the bundled grammar and loads it",
		function()
			prepare()
			local output = treesitter.build({ output = deps .. "/site/parser/arktype.so" })
			assert(vim.uv.fs_stat(output), output)
			assert(treesitter.has_parser(), "the arktype parser doesn't load")
			treesitter.setup({ build = false })
		end,
	},
	{
		"injects ArkType into typescript, tsx and javascript through ecma",
		function()
			prepare()
			for _, lang in ipairs({ "typescript", "tsx", "javascript" }) do
				local files = vim.treesitter.query.get_files(lang, "injections")
				local ours = vim.tbl_filter(function(file)
					return file == treesitter.plugin_root .. "/queries/ecma/injections.scm"
				end, files)
				h.eq(1, #ours, lang .. " should include this plugin's ecma injections exactly once")
			end
		end,
	},
	{
		"dumps the ArkType layer's highlights for every corpus file",
		function()
			prepare()
			vim.fn.mkdir(out_dir, "p")
			local files = corpus_files()
			assert(#files > 0, "empty corpus at " .. corpus)
			local skip = skipped()
			for _, name in ipairs(files) do
				if skip[name] then
					goto continue
				end
				local bufnr = open(corpus .. "/" .. name)
				local spans = highlights.spans(bufnr, "arktype", categories)
				local file = assert(io.open(out_dir .. "/" .. name .. ".json", "wb"))
				file:write(vim.json.encode({ source = "corpus/" .. name, spans = spans }))
				file:close()
				vim.api.nvim_buf_delete(bufnr, { force = true })
				::continue::
			end
		end,
	},
	{
		"Vue and Astro, which the oracle can't read, highlight like Svelte's checked lines",
		function()
			prepare()
			local svelte, svelte_lines = fixture_spans("Component.svelte")
			local object = line_spans(svelte, find_line(svelte_lines, 'type({ name: "string"'))
			local expression = line_spans(svelte, find_line(svelte_lines, '{type("string | number")'))
			assert(object ~= "" and expression ~= "", "Svelte's definitions aren't highlighted")
			for _, name in ipairs({ "Component.vue", "Component.astro" }) do
				local spans, lines = fixture_spans(name)
				h.eq(object, line_spans(spans, find_line(lines, 'type({ name: "string"')), name .. " script")
				h.eq("", line_spans(spans, find_line(lines, "notADefinition")), name .. " plain string")
				local template = line_spans(spans, find_line(lines, 'type("string | number")'))
				assert(vim.endswith(template, expression), name .. " template: " .. template)
			end
		end,
	},
}
