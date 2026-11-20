import { Tagged } from "tagged"
import { expect, test } from "vitest"

test("runs through the transform", () => {
	const precompilation = () => Tagged.internal.precompilation
	if (process.env.ARKTYPE_RUNTIME === "arktype")
		expect(precompilation()).not.toMatch(/^function anonymous/)
	// a standalone validator lacks a Type's members: development warns with
	// the fix, then reads undefined as production does, which the build's
	// check of what it read there names
	else {
		expect(precompilation).toThrow(
			"`Tagged.internal` is undefined, but was precompiled as the Type it was at build"
		)
	}
})
