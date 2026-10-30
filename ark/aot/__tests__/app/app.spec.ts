import { type } from "arktype"
import { expect, test } from "vitest"
import { User } from "./schemas.ts"

test("validates", () => {
	const out = User({ name: "Ada", email: "ada", age: 36, tags: [] })
	// what a standalone validator's errors keep of arktype's
	expect(
		out instanceof type.errors &&
			out.issues.map(issue => [issue.code, ...issue.path])
	).toEqual([["pattern", "email"]])
})

test("runs through the transform", () => {
	const precompilation = () => User.internal.precompilation
	if (process.env.ARKTYPE_RUNTIME === "arktype")
		expect(precompilation()).not.toMatch(/^function anonymous/)
	else expect(precompilation).toThrow("internal is a Type's")
})
