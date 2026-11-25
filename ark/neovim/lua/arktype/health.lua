-- :checkhealth arktype
local M = {}

function M.check()
	local health = vim.health
	health.start("arktype.nvim")

	if vim.fn.has("nvim-0.11") == 1 then
		health.ok("Neovim " .. tostring(vim.version()))
	else
		health.error("Neovim 0.11 or later is required")
	end

	local treesitter = require("arktype.treesitter")
	if treesitter.has_parser() then
		health.ok("the arktype parser loads")
	elseif treesitter.grammar_dir() then
		health.warn("the arktype parser isn't built", { "Run :ArkTypeBuild, then restart Neovim" })
	else
		health.error("the arktype parser isn't installed and its grammar wasn't found")
	end

	for _, lang in ipairs({ "typescript", "tsx", "javascript" }) do
		local ok, loaded = pcall(vim.treesitter.language.add, lang)
		if ok and loaded then
			local files = vim.treesitter.query.get_files(lang, "injections")
			local ours = vim.fs.joinpath(treesitter.plugin_root, "queries", "ecma", "injections.scm")
			local found = vim.tbl_contains(files, ours)
			if found then
				health.ok(lang .. ": ArkType definitions are injected")
			elseif #files == 0 then
				health.warn(lang .. ": no injection queries", {
					"Install nvim-treesitter's queries, whose " .. lang .. " queries inherit `ecma`",
				})
			else
				health.warn(lang .. ": its injection queries don't include this plugin's queries/ecma/injections.scm", {
					"Make sure " .. lang .. "'s injections.scm starts with `; inherits: ecma` and this plugin is on 'runtimepath'",
				})
			end
		else
			health.info(lang .. ": no parser, so its ArkType definitions aren't highlighted")
		end
	end

	local diagnostics = require("arktype.diagnostics")
	if diagnostics.config.enabled then
		health.ok(("inline summaries: %s, %s"):format(diagnostics.config.display, diagnostics.config.follow_cursor))
	else
		health.info("inline summaries are off")
	end
end

return M
