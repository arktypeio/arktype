import { strictEqual } from "node:assert"
import "./config.ts"

import { keysOf } from "@ark/util"
import { type } from "arktype"
import { stdout } from "node:process"

const cases = {
	NaN: () => {
		strictEqual(type("number").allows(Number.NaN), true)
	},
	shallowKeyword: () => {
		strictEqual(type.string.description, "a configured string")
		strictEqual(
			type.string(5).toString(),
			"must be a configured string (was number)"
		)
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
