import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { $ark, hasArkKind } from "@ark/schema"
import { noSuggest } from "@ark/util"
import { scope, type, type Module } from "arktype"
import {
	arktypeVersion,
	writeEntryConflictMessage,
	writeRuntimeVersionMismatchMessage
} from "arktype/internal/entry.ts"
import { de } from "arktype/locales/de"
import {
	precompileStandalone,
	writeUnprecompilableMessage
} from "arktype/internal/standalone.ts"
import {
	type as runtimeType,
	writeUnavailableMemberMessage
} from "arktype/runtime"
import { buildSync } from "esbuild"
import { spawnSync } from "node:child_process"

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

const entryKey = noSuggest("loadedArktypeEntry")

const importBesideArktype = async (js: string): Promise<any> => {
	const entries = globalThis as Record<string, unknown>
	const entry = entries[entryKey]
	delete entries[entryKey]
	try {
		return await import(urlOf(js))
	} finally {
		entries[entryKey] = entry
	}
}

const load = (
	exports: Record<string, type.Any | Module>
): Promise<Record<string, any>> =>
	importBesideArktype(bundle(precompileStandalone(exports)).js)

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
		attest("toJsonSchema" in T).equals(false)
		attest(JSON.stringify({ T })).equals("{}")
		attest(() => (runtimeType as any).string.allows("s")).throws(
			writeUnavailableMemberMessage("type.string")
		)
		const unanswered = Reflect.ownKeys(type).filter(k => {
			if (k === "length" || k === "name" || k === "errors") return false
			try {
				Reflect.get(runtimeType, k)
				return true
			} catch (e) {
				return (
					(e as Error).message !==
					writeUnavailableMemberMessage(`type.${String(k)}`)
				)
			}
		})
		attest(unanswered).equals([])
	})

	it("writes errors with configured strings", async () => {
		const $ = scope(
			{ T: { a: "string" } },
			{
				domain: { message: "configured" },
				divisor: { message: ctx => `configured ${ctx.problem}` }
			}
		)
		const { T } = $.export()
		const { T: validator } = await load({ T })
		attest(validator({ a: 1 }).summary).equals(T({ a: 1 }).toString())
		attest(validator({ a: 1 }).summary).snap("configured")
	})

	it("keeps the descriptions of a type another scope describes", async () => {
		const lib = scope(
			{ y: { v: "number" } },
			{ domain: { description: () => "a custom number" } }
		).export()
		const types = {
			ownFirst: type({ a: { v: "number" } }),
			keptAfter: type({ a: lib.y }),
			keptFirst: type({ b: lib.y }),
			ownAfter: type({ b: { v: "number" } })
		}
		const validators = await load(types)
		const input = { a: { v: "s" }, b: { v: "s" } }
		for (const [name, t] of Object.entries(types))
			attest(validators[name](input).summary).equals(t(input).toString())
		attest(validators.ownFirst(input).summary).snap(
			"a.v must be a number (was a string)"
		)
		attest(validators.keptAfter(input).summary).snap(
			"a.v must be a custom number (was a string)"
		)
	})

	it("exports a module as an object of its validators", async () => {
		const M = scope({
			a: "string",
			b: { a: "a" },
			sub: scope({ c: "number" }).export()
		}).export()
		const validators = await load({ M, a: M.a, "\uD83D\uDE00": M.a })
		attest(Object.keys(validators.M)).equals(Object.keys(M))
		attest(validators.M.a).equals(validators.a)
		attest(validators["\uD83D\uDE00"]).equals(validators.a)
		attest(validators.M.b({ a: 1 }).summary).equals(M.b({ a: 1 }).toString())
		attest(validators.M.sub.c("x").summary).snap(
			"must be a number (was a string)"
		)
	})

	it("emits a Type in meta as its validator", async () => {
		const N = type("number")
		const T = type("string").configure({
			schema: N,
			list: [type("boolean")]
		} as never)
		const U = type("string | number").configure({ schema: N } as never)
		const { T: validator, U: union, N: n } = await load({ T, U, N })
		attest(validator.meta.schema === n).equals(true)
		attest(validator.meta.list[0].expression).equals("boolean")
		attest(validator.meta.list[0](true)).equals(true)
		attest(Object.isFrozen(validator.meta.list)).equals(true)
		attest(validator(1).issues[0].meta.schema === n).equals(true)
		attest(union(true).issues[0].meta.schema === n).equals(true)
	})

	it("freezes what a program reads from it", async () => {
		const T = type({ a: "string" }).configure({
			examples: [{ a: "x" }],
			pattern: /x/g
		} as never)
		const M = scope({ a: "string" }).export()
		const { n: Cyclic } = scope({ n: { "next?": "n", v: "number" } }).export()
		const Even = scope({}, { divisor: { message: "odd" } }).type("number % 2")
		const Long = type("string").atLeastLength(3)
		const artifact = await load({ T, M, Cyclic, Even, Long })
		const { T: validator, M: module } = artifact
		const prototype = Object.getPrototypeOf(validator)
		const shape = artifact.Cyclic("x", { pipe: (node: unknown) => node })
		const config = artifact.Even(1).issues[0].ctx.config
		const nodeMeta = artifact.Long("a").issues[0].meta
		const writes = {
			property: () => (validator.x = 1),
			meta: () => (validator.meta.x = 1),
			example: () => (validator.meta.examples[0].a = "y"),
			pattern: () => (validator.meta.pattern.x = 1),
			method: () => (validator.assert = () => {}),
			deletedMethod: () => delete validator.assert,
			standard: () => (validator["~standard"].validate = () => {}),
			prototypeMethod: () => (prototype.from = () => {}),
			deletedPrototypeMethod: () => delete prototype.from,
			prototype: () => Object.setPrototypeOf(validator, {}),
			type: () => ((runtimeType as any).x = 1),
			module: () => (module.a = validator),
			shape: () => (shape.traverseApply = () => {}),
			config: () => (config.jitless = false),
			configuredWriters: () => (config.divisor.message = "even"),
			nodeMeta: () => (nodeMeta.message = "long")
		}
		const unfrozen = Object.entries(writes).filter(([, write]) => {
			try {
				write()
				return true
			} catch (e) {
				return !(e instanceof TypeError)
			}
		})
		attest(unfrozen.map(([name]) => name)).equals([])
		attest(validator.meta.pattern.test("x")).equals(true)
		attest(validator.meta.pattern.test("x")).equals(false)
		attest(validator({ a: "x" })).equals({ a: "x" })
	})

	it("freezes with the builtins its runtime loaded with", async () => {
		const runtimeUrl = urlOf(bundle(`export * from "arktype/runtime"`).js)
		await import(runtimeUrl)
		const source = precompileStandalone({
			M: scope({ a: "string" }).export()
		}).replace(`"arktype/runtime"`, JSON.stringify(runtimeUrl))
		const { freeze, assign, setPrototypeOf } = Object
		Object.assign(Object, {
			freeze: (o: object) => o,
			assign: (o: object) => o,
			setPrototypeOf: (o: object) => o
		})
		try {
			const { M } = await importBesideArktype(source)
			attest(Object.isFrozen(M)).equals(true)
			attest(Object.isFrozen(M.a)).equals(true)
			attest(M.a.from("x")).equals("x")
		} finally {
			assign(Object, { freeze, assign, setPrototypeOf })
		}
	})

	it("rejects what it can't precompile", () => {
		const isEven = (n: number) => n % 2 === 0
		attest(() =>
			precompileStandalone({ T: type("number").narrow(isEven) })
		).throws(writeUnprecompilableMessage("Function(isEven)"))
		attest(() => precompileStandalone({ T: type("===", { a: 1 }) })).throws(
			writeUnprecompilableMessage('the unit {"a":1}')
		)
		attest(() => precompileStandalone({ "\uD800": type("string") })).throws(
			writeUnprecompilableMessage('the export name "\\ud800"')
		)
		attest(() =>
			precompileStandalone({ M: scope({ "box<t>": { box: "t" } }).export() })
		).throws(writeUnprecompilableMessage("a Generic"))
		const T = scope({}, { domain: { message: () => "configured" } }).type(
			"string"
		)
		attest(() => precompileStandalone({ T })).throws(
			writeUnprecompilableMessage("a configured domain message")
		)
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		attest(() =>
			precompileStandalone({ T: type("string").configure({ cyclic } as never) })
		).throws(writeUnprecompilableMessage("a cyclic object"))
		const accessor = {
			get x() {
				return 1
			}
		}
		attest(() =>
			precompileStandalone({
				T: type("string").configure({ accessor } as never)
			})
		).throws(writeUnprecompilableMessage('{"x":1}\'s properties'))
		const refusalOf = (value: object) => {
			try {
				precompileStandalone({
					T: type("string").configure({ value } as never)
				})
			} catch (e) {
				return (e as Error).message
			}
		}
		attest({
			fakeDate: refusalOf(Object.create(Date.prototype)),
			fakeRegExp: refusalOf(
				Object.assign(Object.create(RegExp.prototype), { lastIndex: 0 })
			),
			map: refusalOf(new Map()),
			date: refusalOf(Object.assign(new Date(0), { x: 1 })),
			regex: refusalOf(Object.assign(/x/, { x: 1 }))
		}).equals({
			fakeDate: writeUnprecompilableMessage("an instance of Date"),
			fakeRegExp: writeUnprecompilableMessage("an instance of RegExp"),
			map: writeUnprecompilableMessage("an instance of Map"),
			date: writeUnprecompilableMessage("a Date with its own properties"),
			regex: writeUnprecompilableMessage("a RegExp with its own properties")
		})
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

	it("bundles without node, scope, parse or code-generating code", () => {
		const { js, modules } = bundle(
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
		attest(/new Function|extends Function/.test(js)).equals(false)
		attest(js.includes("initialRegistryContents")).equals(false)
	})
})
