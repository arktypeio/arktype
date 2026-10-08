import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { $ark, hasArkKind } from "@ark/schema"
import { scope, type } from "arktype"
import { arktypeVersion } from "arktype/internal/entry.ts"
import { de } from "arktype/locales/de"
import {
	precompileStandalone,
	writeUnprecompilableMessage
} from "arktype/internal/standalone.ts"
import {
	writeRuntimeVersionMismatchMessage,
	writeEntryConflictMessage,
	writeUnavailableMemberMessage
} from "arktype/runtime"
import { buildSync } from "esbuild"
import { spawnSync } from "node:child_process"

// a bundle holds only what an artifact imports, so validating with it proves no node is needed
const bundle = (source: string) => {
	const result = buildSync({
		stdin: {
			contents: source,
			resolveDir: fromHere(),
			loader: "js"
		},
		absWorkingDir: fromHere("..", ".."),
		bundle: true,
		format: "esm",
		platform: "neutral",
		conditions: ["ark-ts"],
		write: false,
		metafile: true,
		logLevel: "error"
	})
	return {
		js: result.outputFiles[0].text,
		modules: Object.keys(result.metafile.inputs)
	}
}

const urlOf = (js: string) =>
	`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`

const entryKey = Symbol.for("arktype.entry")

// an artifact refuses to load beside arktype, which comparing it with the JIT requires
const importBesideArktype = async (js: string): Promise<any> => {
	const global = globalThis as Record<symbol, unknown>
	const entry = global[entryKey]
	delete global[entryKey]
	try {
		return await import(urlOf(js))
	} finally {
		global[entryKey] = entry
	}
}

const load = (types: Record<string, type.Any>): Promise<Record<string, any>> =>
	importBesideArktype(bundle(precompileStandalone(types)).js)

const observe = (result: unknown, input: unknown) =>
	hasArkKind(result, "errors") ?
		{
			summary: result.summary,
			errors: result.issues.map(e => ({
				code: e.code,
				path: [...e.path],
				data: e.data,
				expected: e.expected,
				actual: e.actual,
				problem: e.problem,
				message: e.message
			}))
		}
	:	{ out: result, isInput: result === input }

class Point {
	x = 1
	y = 2
}

contextualize(() => {
	it("validates as the types it was precompiled from", async () => {
		const $ = scope({
			tree: { value: "number", "children?": "tree[]" },
			user: {
				name: "string > 0",
				age: "number.integer >= 0",
				"email?": "string.email",
				tags: "string[] <= 3"
			}
		}).export()
		const { a0 } = scope({
			a0: "Record<string, a1 | a2>",
			a1: { p0: "string = 'd'", "p1?": "string" },
			a2: { kind: "'a2'", "p0?": "a0", p1: "a2 | null" }
		}).export()
		// content-equal cycles the JIT tracks apart
		const { x }: Record<string, type.Any> = scope({
			a0: [["Record<string, null>", "...", "a0[]"], "[]"],
			c0: [["Record<string, null>", "...", "c0[]"], "[]"],
			c1: ["c0", "...", "c1[]"],
			x: "a0 & c1"
		} as never).export() as never
		const types = {
			user: $.user,
			cycles: x,
			tree: $.tree,
			deep: a0.onDeepUndeclaredKey("delete"),
			parsed: type({ count: "string.numeric.parse", "+": "delete" }),
			json: type("string.json.parse"),
			shapes: type({ kind: "'circle'", r: "number > 0" }).or({
				kind: "'square'",
				side: "number"
			}),
			mixed: type("string | number[] | Date >= d'2000-01-01T00:00:00Z'"),
			tuple: type(["string", "number = 3", "boolean = true"]),
			piped: type("string.trim").to("string > 1"),
			dates: type({ at: "string.date.iso.parse" }).array(),
			typeError: type.instanceOf(TypeError)
		}
		const validators = await load(types)
		const cyclic: any = { value: 1, children: [] }
		cyclic.children.push(cyclic)
		const cyclicArray: unknown[] = []
		cyclicArray.push(cyclicArray, cyclicArray)
		const inputs = [
			{ name: "a", age: 1, tags: [] },
			{ name: "", age: -1.5, email: "x", tags: ["a", "b", "c", "d"] },
			{ value: 1, children: [{ value: 2 }, { value: "3" }] },
			cyclic,
			cyclicArray,
			{ count: "5", extra: true },
			new Point(),
			'{"a": [1]}',
			"{",
			"",
			{ kind: "circle", r: 0 },
			{ kind: "triangle" },
			[1, "2"],
			new Date(0),
			["a"],
			["a", "b"],
			"  x ",
			" y ",
			[{ at: "2020-01-01" }, { at: "x" }],
			new TypeError("x"),
			{ k: { p1: "s", z: 1 } },
			{ k: { kind: "a2", p1: null, p0: { j: { p1: "x", z: 1 } }, z: 1 } },
			null
		]
		for (const [name, t] of Object.entries(types)) {
			for (const input of inputs) {
				attest(observe(validators[name](input), input)).equals(
					observe(t(input), input)
				)
				attest(validators[name].allows(input)).equals(t.allows(input))
			}
		}
	})

	it("bakes introspection", async () => {
		const T = type({ name: "string", age: "number" }).describe("a person")
		const { T: validator } = await load({ T })
		attest(validator.expression).equals(T.expression)
		attest(validator.description).equals("a person")
		attest(validator.meta).equals({ description: "a person" })
		attest(String(validator)).equals("Type<{ age: number, name: string }>")
		attest(validator.from({ name: "n", age: 1 })).equals({ name: "n", age: 1 })
		attest(() => validator.assert({})).throws.snap(`TraversalError: 
  • age must be a number (was missing)
  • name must be a string (was missing)`)
		attest(validator["~standard"].validate({ name: "n", age: 1 })).equals({
			value: { name: "n", age: 1 }
		})
		attest("jsonSchema" in validator["~standard"]).equals(false)
	})

	it("validates without generating code", async () => {
		const { js } = bundle(precompileStandalone({ T: type({ a: "string" }) }))
		const { Function } = globalThis
		const bodies: string[] = []
		globalThis.Function = new Proxy(Function, {
			construct: (target, args, newTarget) => {
				bodies.push(args[args.length - 1])
				return Reflect.construct(target, args, newTarget)
			}
		})
		try {
			const { T } = await importBesideArktype(js)
			attest(T({ a: 1 }).summary).snap("a must be a string (was a number)")
		} finally {
			globalThis.Function = Function
		}
		attest(bodies).equals([])
	})

	it("loads without a global one of its validators reads", async () => {
		const Global = class {}
		Object.assign(globalThis, { Global })
		const { js } = bundle(
			precompileStandalone({ S: type("string"), G: type.instanceOf(Global) })
		)
		delete (globalThis as { Global?: unknown }).Global
		const { S } = await importBesideArktype(js)
		attest(S("s")).equals("s")
	})

	it("throws on members that need arktype", async () => {
		const { T } = await load({ T: type("string") })
		attest(() => T.and("number")).throws(writeUnavailableMemberMessage("and"))
		attest(() => T.in).throws(writeUnavailableMemberMessage("in"))
		attest(() => T.toJsonSchema()).throws(
			writeUnavailableMemberMessage("toJsonSchema")
		)
	})

	it("rejects what it can't precompile", () => {
		const isEven = (n: number) => n % 2 === 0
		attest(() =>
			precompileStandalone({ T: type("number").narrow(isEven) })
		).throws(writeUnprecompilableMessage("Function(isEven)"))
		attest(() => precompileStandalone({ T: type("===", { a: 1 }) })).throws(
			writeUnprecompilableMessage('the unit {"a":1}')
		)
	})

	it("rejects a configured locale", () => {
		const { locale } = $ark.config
		Object.assign($ark.config, { locale: de })
		try {
			attest(() => precompileStandalone({ T: type("string") })).throws(
				writeUnprecompilableMessage("a configured locale")
			)
		} finally {
			Object.assign($ark.config, { locale })
		}
	})

	it("checks the runtime's version before reading its exports", async () => {
		const mismatched = precompileStandalone({ T: type("string") })
			.replace(
				`assertRuntimeVersion("${arktypeVersion}")`,
				`assertRuntimeVersion("0.0.0")`
			)
			.replace("runtime.Validator", "runtime.NextValidator")
		const error = await importBesideArktype(bundle(mismatched).js).catch(
			(e: Error) => e
		)
		attest(error.message).equals(
			writeRuntimeVersionMismatchMessage("0.0.0", arktypeVersion)
		)
	})

	it("refuses to load beside arktype", async () => {
		const { js } = bundle(precompileStandalone({ T: type("boolean") }))
		const error = await import(urlOf(js)).catch((e: Error) => e)
		attest(error.message).equals(
			writeEntryConflictMessage("arktype/runtime", "arktype")
		)
	})

	it("keeps arktype from loading beside it", () => {
		const { js } = bundle(precompileStandalone({ T: type("string") }))
		const { stderr } = spawnSync(
			process.execPath,
			["--conditions=ark-ts", "--input-type=module"],
			{
				cwd: fromHere(),
				input: `await import(${JSON.stringify(urlOf(js))})\nawait import("arktype")`,
				encoding: "utf8"
			}
		)
		attest(
			stderr.includes(writeEntryConflictMessage("arktype", "arktype/runtime"))
		).equals(true)
	})

	it("bundles without node, scope or parse code", () => {
		const { modules } = bundle(
			precompileStandalone({
				T: type({ a: "string.numeric.parse", b: "(number | Date)[]" }).or(
					"string.json.parse"
				)
			})
		)
		const runtimeModules = new Set([
			"<stdin>",
			"schema/runtime.ts",
			"schema/shared/errorWriters.ts",
			"schema/shared/errors.ts",
			"schema/shared/locale.ts",
			"schema/shared/registry.ts",
			"schema/shared/render.ts",
			"schema/shared/transform.ts",
			"schema/shared/traversal.ts",
			"schema/shared/utils.ts",
			"schema/structure/shared.ts",
			"type/entry.ts",
			"type/keywords/functions.ts",
			"type/runtime.ts"
		])
		attest(
			modules.filter(
				path => !path.startsWith("util/") && !runtimeModules.has(path)
			)
		).equals([])
	})
})
