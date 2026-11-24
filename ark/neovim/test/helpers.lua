local M = {}

M.data_dir = os.getenv("ARKTYPE_TEST_DATA")
M.repo_root = vim.fs.dirname(vim.fs.dirname(vim.fs.dirname(vim.fs.dirname(vim.fs.abspath(debug.getinfo(1, "S").source:sub(2))))))

---@param path string
function M.read_json(path)
	local file = assert(io.open(path, "rb"), "missing " .. path)
	local text = file:read("*a")
	file:close()
	return vim.json.decode(text, { luanil = { object = true, array = true } })
end

--- Reads a file test/test.ts generated.
---@param name string
function M.data(name)
	assert(M.data_dir, "ARKTYPE_TEST_DATA is unset; run the suite with `node test/test.ts`")
	return M.read_json(M.data_dir .. "/" .. name)
end

local function show(value)
	if type(value) == "string" then
		return ("%q"):format(value)
	end
	return vim.inspect(value)
end

function M.eq(expected, actual, context)
	if not vim.deep_equal(expected, actual) then
		error(
			("%sexpected %s\n     got %s"):format(
				context and (context .. "\n") or "",
				show(expected),
				show(actual)
			),
			2
		)
	end
end

--- Fails once with up to `limit` mismatches listed, rather than at the first.
---@param failures string[]
---@param total integer
function M.report(failures, total, limit)
	if #failures == 0 then
		return
	end
	limit = limit or 10
	local shown = {}
	for index = 1, math.min(limit, #failures) do
		shown[index] = failures[index]
	end
	error(("%d of %d cases differ:\n%s"):format(#failures, total, table.concat(shown, "\n\n")), 2)
end

return M
