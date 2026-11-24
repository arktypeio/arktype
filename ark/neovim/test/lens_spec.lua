-- Where and what the inline summaries show, against ErrorLens's rules for the
-- settings the extension ships (followCursor "closestProblem", hints off).
local h = require("helpers")
local diagnostics = require("arktype.diagnostics")

local E, W, I, H = vim.diagnostic.severity.ERROR, vim.diagnostic.severity.WARN, vim.diagnostic.severity.INFO, vim.diagnostic.severity.HINT

local ns_a = vim.api.nvim_create_namespace("arktype.test.a")
local ns_b = vim.api.nvim_create_namespace("arktype.test.b")

local function buffer(lines)
	local bufnr = vim.api.nvim_create_buf(true, false)
	local content = {}
	for index = 1, lines or 20 do
		content[index] = "line " .. index
	end
	vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, content)
	vim.api.nvim_set_current_buf(bufnr)
	return bufnr
end

local function diag(lnum, severity, message)
	return { lnum = lnum, col = 0, severity = severity, message = message or ("problem on " .. lnum) }
end

--- The summaries drawn, as { [line] = text }.
local function shown(bufnr)
	local result = {}
	for _, mark in ipairs(vim.api.nvim_buf_get_extmarks(bufnr, diagnostics.ns, 0, -1, { details = true })) do
		local chunks = mark[4].virt_text
		result[mark[2]] = chunks[#chunks][1]
	end
	return result
end

local function move(bufnr, line)
	vim.api.nvim_win_set_cursor(0, { line + 1, 0 })
	vim.api.nvim_exec_autocmds("CursorMoved", { buffer = bufnr })
end

local function reset(config)
	vim.diagnostic.reset()
	diagnostics.setup(config)
end

return {
	{
		"shows only the line closest to the cursor, the one above on a tie",
		function()
			reset()
			local bufnr = buffer()
			vim.diagnostic.set(ns_a, bufnr, { diag(2, E), diag(8, E) })
			move(bufnr, 4)
			h.eq({ [2] = "problem on 2" }, shown(bufnr))
			move(bufnr, 6)
			h.eq({ [8] = "problem on 8" }, shown(bufnr))
			move(bufnr, 5)
			h.eq({ [2] = "problem on 2" }, shown(bufnr))
		end,
	},
	{
		"updates as diagnostics change, across every namespace",
		function()
			reset()
			local bufnr = buffer()
			move(bufnr, 10)
			vim.diagnostic.set(ns_a, bufnr, { diag(2, E) })
			h.eq({ [2] = "problem on 2" }, shown(bufnr))
			vim.diagnostic.set(ns_b, bufnr, { diag(11, W) })
			h.eq({ [11] = "problem on 11" }, shown(bufnr))
			vim.diagnostic.reset(ns_b, bufnr)
			h.eq({ [2] = "problem on 2" }, shown(bufnr))
		end,
	},
	{
		"shows a line's most severe problem, the first of equals",
		function()
			reset()
			local bufnr = buffer()
			move(bufnr, 3)
			vim.diagnostic.set(ns_a, bufnr, {
				diag(3, I, "info"),
				diag(3, W, "first warning"),
				diag(3, W, "second warning"),
			})
			h.eq({ [3] = "first warning" }, shown(bufnr))
			vim.diagnostic.set(ns_b, bufnr, { diag(3, E, "error") })
			h.eq({ [3] = "error" }, shown(bufnr))
		end,
	},
	{
		"leaves hints out, so a further error is the closest problem",
		function()
			reset()
			local bufnr = buffer()
			move(bufnr, 5)
			vim.diagnostic.set(ns_a, bufnr, { diag(5, H, "hint"), diag(9, E, "error") })
			h.eq({ [9] = "error" }, shown(bufnr))
		end,
	},
	{
		"shows the ArkType part of a message on one line",
		function()
			reset()
			local bufnr = buffer()
			move(bufnr, 1)
			vim.diagnostic.set(ns_a, bufnr, {
				diag(
					1,
					E,
					[[Argument of type '"strin"' is not assignable to parameter of type '"string" | "symbol"'.]]
				),
			})
			h.eq({ [1] = [["string" | "symbol"]] }, shown(bufnr))
			vim.diagnostic.set(ns_a, bufnr, { diag(1, E, "No overload matches this call.\n\tfirst\r\nsecond") })
			h.eq({ [1] = "second" }, shown(bufnr))
			vim.diagnostic.set(ns_a, bufnr, { diag(1, E, "tabbed\tmessage\n") })
			h.eq({ [1] = "" }, shown(bufnr))
		end,
	},
	{
		"follow_cursor_more shows that many more lines",
		function()
			reset({ follow_cursor_more = 1 })
			local bufnr = buffer()
			vim.diagnostic.set(ns_a, bufnr, { diag(1, E), diag(4, E), diag(9, E) })
			move(bufnr, 5)
			-- 1 and 9 are both 4 lines away; the tie goes to the line above
			h.eq({ [1] = "problem on 1", [4] = "problem on 4" }, shown(bufnr))
			move(bufnr, 7)
			h.eq({ [4] = "problem on 4", [9] = "problem on 9" }, shown(bufnr))
		end,
	},
	{
		"allLines and activeLine follow ErrorLens",
		function()
			reset({ follow_cursor = "allLines" })
			local bufnr = buffer()
			vim.diagnostic.set(ns_a, bufnr, { diag(1, E), diag(4, E) })
			h.eq({ [1] = "problem on 1", [4] = "problem on 4" }, shown(bufnr))
			reset({ follow_cursor = "activeLine" })
			bufnr = buffer()
			vim.diagnostic.set(ns_a, bufnr, { diag(1, E), diag(4, E) })
			move(bufnr, 4)
			h.eq({ [4] = "problem on 4" }, shown(bufnr))
			move(bufnr, 2)
			h.eq({}, shown(bufnr))
		end,
	},
	{
		"virtual_lines and virtual_text displays use the same text",
		function()
			reset({ display = "virtual_lines" })
			local config = vim.diagnostic.config().virtual_lines
			h.eq(true, config.current_line)
			h.eq([["a" | "ab"]], config.format({ message = [[Type '"a"' is not assignable to type '"a" | "ab"'.]] }))
			local bufnr = buffer()
			vim.diagnostic.set(ns_a, bufnr, { diag(1, E) })
			h.eq({}, shown(bufnr))
			vim.diagnostic.config({ virtual_lines = false })
			reset({ display = "virtual_text" })
			h.eq(diagnostics.format, vim.diagnostic.config().virtual_text.format)
			vim.diagnostic.config({ virtual_text = false })
		end,
	},
	{
		"turning it off clears what's shown",
		function()
			reset()
			local bufnr = buffer()
			move(bufnr, 1)
			vim.diagnostic.set(ns_a, bufnr, { diag(1, E) })
			h.eq({ [1] = "problem on 1" }, shown(bufnr))
			diagnostics.setup({ enabled = false })
			h.eq({}, shown(bufnr))
			vim.diagnostic.set(ns_a, bufnr, { diag(2, E) })
			h.eq({}, shown(bufnr))
		end,
	},
}
