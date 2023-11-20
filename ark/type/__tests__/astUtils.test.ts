import { attest } from "@arktype/attest"
import type { astToString } from "../parser/semantic/utils.js"

describe("astToString", () => {
	it("no parentheses if nested ast is an array", () => {
		const t = {} as unknown as astToString<[["number", "[]"], "|", "number"]>
		attest<"'number[]|number'">(t)
	})
	it("parentheses if nested ast is an infix expression", () => {
		const t = {} as unknown as astToString<[["0", "|", "1"], "|", "string"]>
		attest<"'(0|1)|string'">(t)
	})
	it("defaults to '...' if input is bad", () => {
		const t = {} as unknown as astToString<["0", "///", "1"]>
		attest<"'...'">(t)
	})
})
