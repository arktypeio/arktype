import { expect, mock, test } from "bun:test"

test("creates each validator from the helpers the build read", async () => {
	const { Optional } = await import("./sites.ts")
	expect(Optional(undefined)).toBe(undefined)
})

test("a mocked static helper", async () => {
	const optional = (def: string) => def
	mock.module("./helpers.ts", () => ({ optional }))
	await expect(import("./optional.ts")).rejects.toThrow(
		"`optional` (helpers.ts:1:14) is a function, but was precompiled as the function helpers.ts exports as `optional`"
	)
})
