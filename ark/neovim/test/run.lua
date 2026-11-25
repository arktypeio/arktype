-- Runs every test/*_spec.lua in this Neovim. Each spec returns a list of
-- { name, fn } pairs; `fn` raises to fail. Started by test/test.ts, which
-- passes the generated fixture directory in ARKTYPE_TEST_DATA.
local root = vim.fs.dirname(vim.fs.dirname(vim.fs.abspath(debug.getinfo(1, "S").source:sub(2))))
vim.opt.rtp:prepend(root)
package.path = root .. "/test/?.lua;" .. package.path

local filter = os.getenv("ARKTYPE_TEST_GREP")
local specs = vim.fn.glob(root .. "/test/*_spec.lua", false, true)
table.sort(specs)

local passed, failed = 0, {}
for _, file in ipairs(specs) do
	local spec_name = vim.fs.basename(file):gsub("_spec%.lua$", "")
	local tests = dofile(file)
	for _, test in ipairs(tests) do
		local name = spec_name .. ": " .. test[1]
		if not filter or name:find(filter, 1, true) then
			local ok, err = xpcall(test[2], debug.traceback)
			if ok then
				passed = passed + 1
				io.stdout:write("  ok  ", name, "\n")
			else
				failed[#failed + 1] = name
				io.stdout:write("  FAIL ", name, "\n", tostring(err), "\n")
			end
		end
	end
end

io.stdout:write(("\n%d passed, %d failed\n"):format(passed, #failed))
for _, name in ipairs(failed) do
	io.stdout:write("  failed: ", name, "\n")
end
os.exit(#failed == 0 and 0 or 1)
