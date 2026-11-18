import { afterEach, expect, test, vi } from "vitest"

const mocked: string[] = []

const mock = (path: string, factory: () => object) => {
	mocked.push(path)
	vi.doMock(path, factory)
}

// validators are created on import, so a failing check rejects the import
const create = () => import("./sites.ts")

afterEach(() => {
	for (const path of mocked.splice(0)) vi.doUnmock(path)
	vi.resetModules()
})

test("creates each validator from what the build read", async () => {
	const sites = await create()
	expect(sites.Limited("abcdef").toString()).toBe("must be at most length 5")
	expect(sites.Optional(undefined)).toBe(undefined)
	expect(sites.Trimmed(" a ")).toBe("a")
})

test("a mocked module", async () => {
	mock("./limits.ts", () => ({ max: 9 }))
	await expect(create()).rejects.toThrow("`max` is 9, but was precompiled as 5")
})

test("a mocked static helper", async () => {
	mock("./helpers.ts", () => ({ optional: (def: string) => def }))
	await expect(create()).rejects.toThrow(
		"`optional` (helpers.ts:1:14) is a function, but was precompiled as the function helpers.ts exports as `optional`"
	)
})

test("a mutated import", async () => {
	const { shape } = await import("./shapes.ts")
	shape.name = "number"
	await expect(create()).rejects.toThrow(
		'`shape.name` is "number", but was precompiled as "string"'
	)
})

test("a mutated import another site reads elsewhere", async () => {
	const { pair } = await import("./shapes.ts")
	pair.first = "number"
	await expect(create()).rejects.toThrow(
		'`pair.first` is "number", but was precompiled as "string"'
	)
})

test("a mutated plain object", async () => {
	const { tweaks } = await import("./tweaks.ts")
	tweaks.enabled = true
	await expect(create()).rejects.toThrow(
		"`range.min` is 2, but was precompiled as 1"
	)
})

test("a polyfilled builtin", async () => {
	// the runtime captures each builtin when it loads, before a polyfill replaces it
	await import("arktype")
	const { Blob } = globalThis
	globalThis.Blob = class Blob {} as never
	try {
		await expect(create()).rejects.toThrow(
			"is a class, but was precompiled as a class extending Blob"
		)
	} finally {
		globalThis.Blob = Blob
	}
})
