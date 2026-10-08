import { expect, test } from "vitest"
import { User } from "./schemas.ts"

test("validates", () => {
	expect(
		User({ name: "Ada", email: "ada", age: 36, tags: [] }).toString()
	).toBe('email must be an email address (was "ada")')
})

test("runs through the transform", () => {
	const precompilation = () => User.internal.precompilation
	if (process.env.ARKTYPE_RUNTIME === "arktype")
		expect(precompilation()).not.toMatch(/^function anonymous/)
	else expect(precompilation).toThrow("internal is unavailable")
})
