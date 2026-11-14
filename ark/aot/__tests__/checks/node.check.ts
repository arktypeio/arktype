import assert from "node:assert/strict"
import { mock, test } from "node:test"

test("creates each validator from the helpers the build read", async () => {
	const { Optional } = await import("./sites.ts")
	assert.equal(Optional(undefined), undefined)
})

test("a mocked static helper", async () => {
	const optional = (def: string) => def
	mock.module("./helpers.ts", { namedExports: { optional } })
	await assert.rejects(import("./optional.ts"), {
		message:
			"`optional` (helpers.ts:1:14) is a function, but was precompiled as the function helpers.ts exports as `optional`"
	})
})
