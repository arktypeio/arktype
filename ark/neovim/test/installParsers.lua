-- Installs the host parsers the suite highlights with, through the pinned
-- nvim-treesitter checkout test/test.ts cloned. Run by test.ts:
--   nvim --clean --headless -l test/installParsers.lua <deps dir> <lang>...
local deps = assert(arg[1], "deps dir")
local languages = { unpack(arg, 2) }

vim.opt.rtp:prepend(deps .. "/nvim-treesitter")
local treesitter = require("nvim-treesitter")
treesitter.setup({ install_dir = deps .. "/site" })
local ok = treesitter.install(languages, { summary = true }):wait(30 * 60 * 1000)
local installed = treesitter.get_installed("parsers")
local missing = vim.tbl_filter(function(lang)
	return not vim.tbl_contains(installed, lang)
end, languages)
if not ok or #missing > 0 then
	io.stderr:write("failed to install: " .. table.concat(missing, ", ") .. "\n")
	os.exit(1)
end
