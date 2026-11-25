local h = require("helpers")
local diagnostics = require("arktype.diagnostics")
local regex = require("arktype.regex")

local function check_rewrites(cases)
	local failures = {}
	for _, case in ipairs(cases) do
		local output, rule = diagnostics.rewrite(case.input)
		local expected_rule = case.rule and case.rule + 1 or nil
		if output ~= case.output or rule ~= expected_rule then
			failures[#failures + 1] = ("%s\n  input    %q\n  expected %q (rule %s)\n  got      %q (rule %s)"):format(
				case.name or "",
				case.input,
				case.output,
				tostring(expected_rule),
				output,
				tostring(rule)
			)
		end
		if case.inline then
			local inline = diagnostics.inline(output)
			if inline ~= case.inline then
				failures[#failures + 1] = ("%s inline\n  input    %q\n  expected %q\n  got      %q"):format(
					case.name or "",
					case.input,
					case.inline,
					inline
				)
			end
		end
	end
	h.report(failures, #cases)
end

return {
	{
		"rules are ark/extension/package.json's errorLens.replace, verbatim",
		function()
			local manifest = h.read_json(h.repo_root .. "/ark/extension/package.json")
			h.eq(
				manifest.contributes.configurationDefaults["errorLens.replace"],
				diagnostics.rules
			)
		end,
	},
	{
		"every conformance fixture rewrites byte for byte",
		function()
			local cases = h.data("conformanceCases.json")
			assert(#cases > 0, "no conformance cases")
			check_rewrites(cases)
		end,
	},
	{
		"random messages rewrite and inline exactly as V8 runs ErrorLens",
		function()
			check_rewrites(h.data("fuzzDiagnostics.json"))
		end,
	},
	{
		"random patterns match exactly as V8 with the iu flags",
		function()
			local cases = h.data("fuzzRegex.json")
			local failures = {}
			for _, case in ipairs(cases) do
				local re = regex.compile(case.pattern)
				local result = regex.exec(re, case.subject)
				local actual = nil
				if result then
					actual = {}
					for group = 0, re.group_count do
						actual[group + 1] = result[group] or vim.NIL
					end
				end
				local expected = case.match
				if expected then
					for index = 1, re.group_count + 1 do
						if expected[index] == nil then
							expected[index] = vim.NIL
						end
					end
				end
				if not vim.deep_equal(expected, actual) then
					failures[#failures + 1] = ("/%s/iu on %q\n  expected %s\n  got      %s"):format(
						case.pattern,
						case.subject,
						vim.inspect(expected),
						vim.inspect(actual)
					)
				end
			end
			h.report(failures, #cases)
		end,
	},
	{
		"rejects syntax it can't match like V8 rather than guessing",
		function()
			for _, pattern in ipairs({ "(?<=a)b", "(?<name>a)", "a{", "\\1(a)(b)\\3", "(", "[b-a]" }) do
				assert(not pcall(regex.compile, pattern), pattern .. " should not compile")
			end
		end,
	},
	{
		"a long completion message rewrites quickly",
		function()
			local keywords = {}
			for index = 1, 400 do
				keywords[index] = ('"string.keyword%d"'):format(index)
			end
			local message = ("Argument of type '\"strin\"' is not assignable to parameter of type '%s'."):format(
				table.concat(keywords, " | ")
			)
			local start = vim.uv.hrtime()
			local output, rule = diagnostics.rewrite(message)
			local elapsed_ms = (vim.uv.hrtime() - start) / 1e6
			h.eq(4, rule)
			h.eq(table.concat(keywords, " | "), output)
			assert(elapsed_ms < 50, ("took %.1fms"):format(elapsed_ms))
		end,
	},
}
