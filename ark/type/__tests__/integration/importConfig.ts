import { strictEqual } from "node:assert"
import { config } from "./config.ts"

import { keysOf } from "@ark/util"
import { type } from "arktype"
import { stdout } from "node:process"

const cases = {
	NaN: () => {
		strictEqual(type("number").allows(Number.NaN), true)
	},
	shallowModuleKeyword: () => {
		const expected = config.keywords.string.description
		strictEqual(type.string.description, expected)
		strictEqual(type.string(5).toString(), `must be a ${expected} (was number)`)
	},
	deepLeafKeyword: () => {
		const pretrimmed = type.keywords.string.trim.preformatted
		const expected = config.keywords["string.trim.preformatted"].description
		strictEqual(pretrimmed.description, expected)
		strictEqual(pretrimmed(" ").toString(), `must be ${expected} (was " ")`)
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
