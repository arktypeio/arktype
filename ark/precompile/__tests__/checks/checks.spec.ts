import { afterEach, expect, test, vi } from "vitest"

const mocked: string[] = []

const mock = (path: string, factory: () => object) => {
	mocked.push(path)
	vi.doMock(path, factory)
}

const original = async (path: string) =>
	(await vi.importActual(path)) as Record<string, unknown>

// each validator is created when the module is imported, so a check that fails rejects the import
const create = () => import("./sites.ts")

afterEach(() => {
	for (const path of mocked.splice(0)) vi.doUnmock(path)
	vi.unstubAllEnvs()
	vi.resetModules()
})

test("creates each validator from what the build read", async () => {
	const sites = await create()
	expect(sites.Limited("abcdef").toString()).toBe(
		"must be at most length 5 (was 6)"
	)
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
		"`optional` (helpers.ts:1:14) is Function(optional), but was precompiled as the function helpers.ts exports as `optional`"
	)
})

test("a stubbed define", async () => {
	expect((await import("./moded.ts")).Moded("a")).toBe("a")
	vi.resetModules()
	vi.stubEnv("ARK_MODE", "strict")
	await expect(import("./moded.ts")).rejects.toThrow(
		'`process.env.ARK_MODE` is "strict", but was precompiled as "loose"'
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

test("a hole with another arity", async () => {
	mock("./morphs.ts", async () => ({
		...(await original("./morphs.ts")),
		trim: (s: string, _: unknown) => s
	}))
	await expect(create()).rejects.toThrow(
		"is a function of 2 or more parameters, but was precompiled as a function of 1 parameter"
	)
})

test("a hole of another kind", async () => {
	mock("./morphs.ts", async () => ({
		...(await original("./morphs.ts")),
		trim: Symbol("trim")
	}))
	await expect(create()).rejects.toThrow(
		"is Symbol(trim), but was precompiled as a function of 1 parameter"
	)
})

test("a hole of another kind in a definition folded to what it throws", async () => {
	await expect(import("./folds.ts")).rejects.toThrow('code: "morph"')
	vi.resetModules()
	mock("./containers.ts", () => ({ double: Symbol("double") }))
	await expect(import("./folds.ts")).rejects.toThrow(
		"is Symbol(double), but was precompiled as a function of 1 parameter"
	)
})

test("a hole with another prototype", async () => {
	mock("./morphs.ts", async () => ({
		...(await original("./morphs.ts")),
		Pet: class Pet extends Date {}
	}))
	await expect(create()).rejects.toThrow(
		"is a class extending Date, but was precompiled as a class"
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
