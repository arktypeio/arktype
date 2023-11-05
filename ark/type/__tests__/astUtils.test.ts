import { attest } from "@arktype/attest"
import { describe, test } from "mocha"
import { type astToString } from "../parser/semantic/utils.js"

describe("astToString", () => {
	test("no parentheses if nested ast is an array", () => {
		const t = {} as unknown as astToString<[["number", "[]"], "|", "number"]>
		attest(t).typed as "'number[]|number'"
	})
	test("parentheses if nested ast is an infix expression", () => {
		const t = {} as unknown as astToString<[["0", "|", "1"], "|", "string"]>
		attest(t).typed as "'(0|1)|string'"
	})
	test('defaults to "..." if input is bad', () => {
		const t = {} as unknown as astToString<["0", "///", "1"]>
		attest(t).typed as "'...'"
	})
})
