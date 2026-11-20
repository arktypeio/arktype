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
	// a standalone validator lacks a Type's members: development warns with
	// the fix, then reads undefined as production does, which the build's
	// check of what it read there names
	else {
		expect(precompilation).toThrow(
			"`User.internal` is undefined, but was precompiled as the Type it was at build"
		)
	}
})
