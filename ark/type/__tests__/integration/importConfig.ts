import { AssertionError, strictEqual } from "node:assert"
import { config } from "./config.ts"

import { hasArkKind } from "@ark/schema"
import { flatMorph, keysOf } from "@ark/util"
import { ark, type } from "arktype"
import { stdout } from "node:process"

const cases = {
	NaN: () => {
		strictEqual(type("number").allows(Number.NaN), true)
	},
	shallowLeafKeyword: () => {
		const expected = config.keywords.null.description
		strictEqual(type.null.description, expected)
		strictEqual(
			type.null(undefined)?.toString(),
			`must be ${expected} (was undefined)`
		)
	},
	shallowModuleKeyword: () => {
		const expected = config.keywords.string.description
		strictEqual(type.string.description, expected)
		strictEqual(type.string(5).toString(), `must be ${expected} (was a number)`)
	},
	deepModuleKeyword: () => {
		const numeric = type.keywords.string.numeric.root
		const expected = config.keywords["string.numeric"].description
		strictEqual(numeric.description, expected)
		strictEqual(numeric("abc").toString(), `must be ${expected} (was "abc")`)
	},
	deepLeafKeyword: () => {
		const pretrimmed = type.keywords.string.trim.preformatted
		const expected = config.keywords["string.trim.preformatted"].description
		strictEqual(pretrimmed.description, expected)
		strictEqual(pretrimmed(" ").toString(), `must be ${expected} (was " ")`)
	},
	allResolutionsHaveMatchingQualifiedName: () => {
		const mismatches = flatMorph(
			ark.internal.resolutions,
			(qualifiedAlias, resolution, i: number) => {
				if (!resolution || typeof resolution === "string") return []
				if (hasArkKind(resolution, "generic")) return []
				if (qualifiedAlias !== resolution.meta.alias) {
					return [
						i,
						{ expected: qualifiedAlias, actual: resolution.meta.alias }
					]
				}
				return []
			}
		)

		if (mismatches.length) {
			throw new AssertionError({
				message:
					"The following resolutions had mismatching qualifiedNames:\n" +
					mismatches.map(m => `${m.expected} (was ${m.actual})`).join("\n")
			})
		}
	}
}

let failed = 0

keysOf(cases).forEach(name => {
	stdout.write(name)
	try {
		cases[name]()
		stdout.write("✅\n")
	} catch (e) {
		stdout.write("❌\n")
		console.group()
		console.error(String(e))
		console.groupEnd()
		failed = 1
	}
})

if (failed) process.exit(failed)
