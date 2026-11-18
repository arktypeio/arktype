import { Tagged } from "tagged"
import { expect, test } from "vitest"

test("runs through the transform", () => {
	const precompilation = () => Tagged.internal.precompilation
	if (process.env.ARKTYPE_RUNTIME === "arktype")
		expect(precompilation()).not.toMatch(/^function anonymous/)
	else expect(precompilation).toThrow("internal is a Type's")
})
