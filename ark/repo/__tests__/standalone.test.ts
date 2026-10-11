import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	$ark,
	hasArkKind,
	type ArkSchemaConfig,
	writeInvalidJsonSchemaTargetMessage,
	type Locale,
	type ToJsonSchema,
	type Traversal
} from "@ark/schema"
import {
	configMismatchMessage,
	configuredUnlikeBuildMessage,
	fingerprintOf,
	reconfiguredMessage,
	unrenderedLocaleMessage,
	writeCreatedBeforeConfigureMessage,
	writtenConfigMessage
} from "@ark/schema/runtime"
import { arkKindOf, flatMorph, noSuggest } from "@ark/util"
import { ark, generic, match, scope, type, type Scope } from "arktype"
import {
	allowIslands,
	arktypeVersion,
	claimEntry,
	writeEntryConflictMessage,
	writeRuntimeVersionMismatchMessage
} from "arktype/internal/entry.ts"
import { de } from "arktype/locales/de"
import {
	precompileStandalone,
	writeUnprecompilableMessage,
	type FactoryParam,
	type StandaloneExport,
	type StandaloneFactory
} from "arktype/internal/standalone.ts"
import {
	bakedJsonSchemaOptionsMessage,
	type as runtimeType,
	writeCreationMismatchMessage,
	writeIdentityMismatchMessage,
	writeRenamedHoleMessage,
	writeUnbakedMessage,
	type HoleKind,
	type IntrospectionMember
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

// the program's configure call runs before the artifact, as its config module does, and each validator is read as a site reads it
const load = async (
	exports: Record<string, StandaloneExport>,
	configure = "",
	fingerprint?: string,
	introspection?: IntrospectionMember[]
): Promise<Record<string, any>> => {
	const { code, folds } = precompileStandalone(exports, {
		configured:
			fingerprint === undefined ? undefined : { fingerprint, path: "main.ts" },
		introspection
	})
	const artifact = await importBesideArktype(
		bundle(code.replace(runtimeImport, `${runtimeImport}\n${configure}`)).js
	)
	return flatMorph(exports, (name, value) => {
		if (arkKindOf(value) !== undefined) return [name, artifact[name]()]
		const fold = folds[name]
		return [
			name,
			fold ?
				(...args: unknown[]) => artifact[fold[0]](fold[1], ...args)
			:	artifact[name]
		]
	})
}

// what creating a validator after the given configure() call throws
const messageOf = (configure: string, fingerprint?: string) =>
	load({ T: type("string") }, configure, fingerprint).then(
		() => "",
		(e: Error) => e.message
	)

const runtimeImport = `import * as runtime from "arktype/runtime"`

// the build holds another function in place of each the program will pass, named by a placeholder its factory completes with the received function's name
const standIn = <fn extends Function>(fn: fn, id: string, name = ""): fn =>
	Object.defineProperty(fn, "name", { value: `${name}$hole_${id}` })

// a factory built with each hole's value, as a build passes it in place of its source
const jsonSchemaErrorOf = (t: { toJsonSchema: () => unknown }) => {
	try {
		t.toJsonSchema()
	} catch (e) {
		const error = e as ToJsonSchema.Error
		return [
			Object.keys(error),
			error.name,
			error.code,
			error.context,
			error.hasCode(error.code),
			error instanceof Error
		]
	}
}

const loadFactory = async (
	t: type.Any,
	holes: [kind: HoleKind, label: string, value: unknown][],
	introspection?: IntrospectionMember[]
): Promise<(...holes: unknown[]) => any> =>
	(
		await load(
			{
				T: {
					type: t,
					params: holes.map(([kind, label, value]) => ({ kind, label, value }))
				}
			},
			undefined,
			undefined,
			introspection
		)
	).T

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
			node: type({ value: "number", "next?": "this" }),
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
		const node: any = { value: 1 }
		node.next = { value: 2, next: node }
		const cyclicArray: unknown[] = []
		cyclicArray.push(cyclicArray, cyclicArray)
		const inputs = [
			{ name: "a", age: 1, tags: [] },
			{ name: "", age: -1.5, email: "x", tags: ["a", "b", "c", "d"] },
			{ value: 1, children: [{ value: 2 }, { value: "3" }] },
			cyclic,
			node,
			{ value: 1, next: { value: "2" } },
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

	it("validates as arktype does an index signature checking a key a default fills", async () => {
		const empty = standIn(() => [], "empty")
		const types = {
			defaulted: type({
				"[string]": "number | boolean | string[]",
				port: "number > 0",
				open: "boolean = true"
			}),
			nested: type({ "[string]": "object", nested: { x: "number = 1" } }),
			thunked: type({
				"[/^t/]": "string[]",
				"[string]": "unknown",
				tags: ["string[]", "=", empty]
			})
		}
		const validators: Record<string, any> = {
			...(await load({ defaulted: types.defaulted, nested: types.nested })),
			thunked: (
				await loadFactory(types.thunked, [["function", "empty", empty]])
			)(empty)
		}
		const inputs = [
			{ port: 1 },
			{ port: 1, open: false, extra: 2 },
			{ port: 0, open: "yes", extra: "y" },
			{ nested: {} },
			{ nested: { x: "1" }, other: 5 },
			{ tags: ["a"], tooMany: 1 },
			{ tags: [1], t2: "x" },
			{}
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

	it("builds errors as arktype does", async () => {
		const T = type({ a: "string", b: { c: "number > 0" } })
		const { T: validator } = await load({ T })
		const input = { b: { c: 0 } }
		const copiesOf = (errors: any) => [
			errors.issues.map((e: object) => Reflect.ownKeys(e)),
			errors.toJSON()
		]
		attest(copiesOf(validator(input))).equals(copiesOf(T(input)))
	})

	it("prints the data of errors at one path whichever validator is created first", async () => {
		const T = type({ "[/^a/]": "string[] >= 2", "[/a$/]": "unknown[] <= 0" })
		const Parsed = type("string.json.parse")
		const input = { a: ["q"] }
		const summary = T(input).toString()
		const alone = await load({ T })
		const afterCallback = await load({ Parsed, T })
		attest([alone.T(input).summary, afterCallback.T(input).summary]).equals([
			summary,
			summary
		])
		attest(summary).snap(
			'a (["q"]) must be...\n  ◦ at least length 2\n  ◦ exactly length 0'
		)
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
		const { js } = bundle(
			precompileStandalone({ T: type({ a: "string" }) }).code
		)
		const { Function } = globalThis
		const bodies: string[] = []
		globalThis.Function = new Proxy(Function, {
			construct: (target, args, newTarget) => {
				bodies.push(args[args.length - 1])
				return Reflect.construct(target, args, newTarget)
			}
		})
		try {
			const T = (await importBesideArktype(js)).T()
			attest(T({ a: 1 }).summary).snap("a must be a string (was a number)")
		} finally {
			globalThis.Function = Function
		}
		attest(bodies).equals([])
	})

	it("gives each Type its own traversal of a prop they share", () => {
		const declarations = precompileStandalone({
			A: type({ id: "number", a: "string" }),
			B: type({ id: "number", b: "string" })
		}).code.match(/^const required\w+Allows/gm)!
		attest(declarations.length).equals(4)
		attest(new Set(declarations).size).equals(3)
	})

	it("loads without a global one of its validators reads", async () => {
		const Global = class {}
		Object.assign(globalThis, { Global })
		const { js } = bundle(
			precompileStandalone({ S: type("string"), G: type.instanceOf(Global) })
				.code
		)
		delete (globalThis as { Global?: unknown }).Global
		const S = (await importBesideArktype(js)).S()
		attest(S("s")).equals("s")
	})

	it("bakes the introspection its build lists", async () => {
		const T = type({ name: "string", "tags?": "string[]" })
		const { T: validator } = await load({ T }, undefined, undefined, [
			"json",
			"toJSON",
			"toJsonSchema",
			"~standard.jsonSchema"
		])
		attest(validator.json).equals(T.json)
		attest(validator.toJSON()).is(validator.json)
		attest(JSON.stringify(validator)).equals(JSON.stringify(T))
		attest(validator.toJsonSchema()).equals(T.toJsonSchema())
		// a new schema each call, as arktype writes one
		attest(validator.toJsonSchema() === validator.toJsonSchema()).equals(false)
		for (const io of ["input", "output"] as const) {
			for (const target of ["draft-2020-12", "draft-07"] as const) {
				attest(validator["~standard"].jsonSchema[io]({ target })).equals(
					T["~standard"].jsonSchema[io]({ target })
				)
			}
		}
		attest(
			validator["~standard"].jsonSchema.input({ target: "draft-07" })
		).snap({
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				tags: { type: "array", items: { type: "string" } }
			},
			required: ["name"]
		})
		attest(() =>
			validator["~standard"].jsonSchema.input({ target: "openapi-3.0" })
		).throws(writeInvalidJsonSchemaTargetMessage("openapi-3.0"))
		// options naming nothing, or only a target whose schema the validator bakes, are what it can write
		attest(validator.toJsonSchema({})).equals(T.toJsonSchema({}))
		for (const target of ["draft-2020-12", "draft-07"] as const) {
			attest(validator.toJsonSchema({ target })).equals(
				T.toJsonSchema({ target })
			)
		}
		attest(() => validator.toJsonSchema({ useRefs: true })).throws(
			bakedJsonSchemaOptionsMessage
		)
		attest(() =>
			validator["~standard"].jsonSchema.output({
				target: "draft-07",
				libraryOptions: { useRefs: true }
			})
		).throws(bakedJsonSchemaOptionsMessage)
		attest(Object.isFrozen(validator["~standard"].jsonSchema)).equals(true)
	})

	it("takes a target only where it bakes that target's JSON Schema", async () => {
		const T = type({ a: "string" })
		const { T: validator } = await load({ T }, undefined, undefined, [
			"toJsonSchema"
		])
		attest(validator.toJsonSchema({ target: "draft-2020-12" })).equals(
			T.toJsonSchema({ target: "draft-2020-12" })
		)
		attest(() => validator.toJsonSchema({ target: "draft-07" })).throws(
			bakedJsonSchemaOptionsMessage
		)
	})

	it("bakes only the introspection its build lists", async () => {
		const { T } = await load(
			{ T: type({ a: "string" }) },
			undefined,
			undefined,
			["toJsonSchema"]
		)
		attest(["json", "toJSON", "toJsonSchema"].filter(k => k in T)).equals([
			"toJsonSchema"
		])
		attest("jsonSchema" in T["~standard"]).equals(false)
	})

	it("bakes introspection printing the functions it receives", async () => {
		const length = standIn((s: string) => s.length, "length")
		const T = type("string").pipe(length)
		const thrownBy = (write: () => unknown) => {
			try {
				write()
			} catch (e) {
				return String(e)
			}
		}
		const json = T.json
		const message = thrownBy(() => T.toJsonSchema())
		const create = await loadFactory(
			T,
			[["function", "length", length]],
			["json", "toJsonSchema"]
		)
		Object.defineProperty(length, "name", { value: "introspected" })
		const validator = create(length)
		attest(json).snap({ in: "string", morphs: ["$ark.$hole_length"] })
		attest(validator.json).snap({ in: "string", morphs: ["$ark.introspected"] })
		attest(message).snap(`ToJsonSchemaError: {
    code: "morph",
    base: {
        type: "string"
    },
    out: null
}`)
		attest(thrownBy(() => validator.toJsonSchema())).equals(message)
		attest(jsonSchemaErrorOf(validator)).equals(jsonSchemaErrorOf(T))
	})

	it("throws a ToJsonSchemaError with the values its context holds, from a validator or a site of its own", async () => {
		const isLong = standIn((s: string) => s.length > 5, "long")
		const Long = type("string").narrow(isLong)
		const long = (
			await loadFactory(Long, [["function", "long", isLong]], ["toJsonSchema"])
		)(isLong)
		const Types = {
			After: type("Date > d'2020-01-01'"),
			Epoch: type.unit(new Date(0)),
			Big: type("1n"),
			Instance: type("instanceof", Map)
		}
		const validators = await load(Types, undefined, undefined, ["toJsonSchema"])
		const sites = await load(
			flatMorph(Types, (name, T) => {
				let thrown: unknown
				try {
					T.toJsonSchema()
				} catch (e) {
					thrown = e
				}
				const site: StandaloneExport = {
					member: "toJsonSchema",
					type: T.internal,
					data: undefined,
					params: [],
					thrown
				}
				return [name, site]
			})
		)
		attest(jsonSchemaErrorOf(long)).equals(jsonSchemaErrorOf(Long))
		for (const [name, T] of Object.entries(Types)) {
			attest(jsonSchemaErrorOf(validators[name])).equals(jsonSchemaErrorOf(T))
			attest(jsonSchemaErrorOf({ toJsonSchema: sites[name] })).equals(
				jsonSchemaErrorOf(T)
			)
		}
	})

	it("freezes the json of a validator, which one printing the same can share", async () => {
		const { A, B } = await load(
			{ A: type({ a: "string" }), B: scope({}).type({ a: "string" }) },
			undefined,
			undefined,
			["json"]
		)
		attest(() => {
			A.json.required[0].key = "b"
		}).throws.snap(
			"TypeError: Cannot assign to read only property 'key' of object '#<Object>'"
		)
		attest(B.json).equals(type({ a: "string" }).json)
	})

	it("keeps apart the Dates and RegExps of Types arktype keeps apart, which a program can write", async () => {
		const { A, B, U } = await load({
			A: type("string").configure({ examples: [/a/g, new Date(0)] as never }),
			B: type("string").configure({ examples: [/a/g, new Date(0)] as never }),
			U: type("d'1970-01-01'")
		})
		const [regex, date] = A(1).issues[0].meta.examples
		const [otherRegex, otherDate] = B(1).issues[0].meta.examples
		regex.exec("aaa")
		Date.prototype.setTime.call(date, 1)
		attest([
			otherRegex.lastIndex,
			otherDate.getTime(),
			U(new Date(5)).issues[0].unit.getTime()
		]).equals([0, 0, 0])
		// held as arktype holds them, so the Type's meta holds the error's
		attest([
			A.meta.examples[0] === regex,
			Object.isFrozen(date),
			Object.getOwnPropertyNames(date)
		]).equals([true, false, []])
	})

	it("creates a Date anew at each call of a factory whose site can run more than once", async () => {
		const T = scope({ d: "d'2001-01-01'" }).type({ at: "d" })
		const { fresh } = await load({
			fresh: { type: T, params: [], fresh: true }
		})
		const unitOf = (validator: any) =>
			validator({ at: new Date(0) }).issues[0].unit
		attest(unitOf(fresh()) === unitOf(fresh())).equals(false)
	})

	it("reads one Date for a Type wherever it reads the Date", async () => {
		const T = type("d'2001-01-01'")
		let thrown: unknown
		try {
			T.toJsonSchema()
		} catch (e) {
			thrown = e
		}
		const { validator, site } = await load(
			{
				validator: T,
				site: {
					member: "toJsonSchema",
					type: T.internal,
					data: undefined,
					params: [],
					thrown
				}
			},
			undefined,
			undefined,
			["toJsonSchema"]
		)
		const thrownUnitOf = (read: () => unknown) => {
			try {
				read()
			} catch (e) {
				return ((e as ToJsonSchema.Error).context as ToJsonSchema.UnitContext)
					.unit
			}
		}
		const units = [
			validator(new Date(0)).issues[0].unit,
			thrownUnitOf(() => validator.toJsonSchema()),
			thrownUnitOf(site),
			thrownUnitOf(site)
		]
		attest(units.map(unit => unit === units[0])).equals([
			true,
			true,
			true,
			true
		])
	})

	it("throws where it's read a JSON Schema that calls a default's thunk", async () => {
		const empty = standIn(() => [], "empty")
		const T = type({ tags: ["string[]", "=", empty] })
		const validator = (
			await loadFactory(
				T,
				[["function", "empty", empty]],
				["json", "toJsonSchema", "~standard.jsonSchema"]
			)
		)(empty)
		const message = writeUnbakedMessage(
			writeUnprecompilableMessage("a JSON Schema calling a default's thunk")
		)
		attest(() => validator.toJsonSchema()).throws(message)
		attest(() =>
			validator["~standard"].jsonSchema.output({ target: "draft-07" })
		).throws(message)
		attest(validator.json).equals(T.json)
		attest(validator({})).equals({ tags: [] })
	})

	it("throws where it's read a JSON Schema whose writing throws", async () => {
		const $ = scope(
			{},
			{
				toJsonSchema: {
					fallback: {
						date: () => {
							throw new Error("no schema")
						}
					}
				}
			}
		)
		const T = $.type("Date > d'2020-01-01'")
		const { T: validator } = await load({ T }, undefined, undefined, [
			"toJsonSchema"
		])
		attest(() => T.toJsonSchema()).throws("no schema")
		attest(() => validator.toJsonSchema()).throws(
			writeUnbakedMessage(
				`${writeUnprecompilableMessage("a JSON Schema whose writing throws")}: Error: no schema`
			)
		)
		attest(validator(new Date(0)).toString()).equals(T(new Date(0)).toString())
	})

	it("raises arktype's TypeError printing a symbol in a JSON Schema's error", async () => {
		const key = Symbol("key")
		const T = type({ [key]: "string" })
		const thrown = (write: () => unknown) => {
			try {
				write()
			} catch (e) {
				return [(e as Error).constructor.name, (e as Error).message]
			}
		}
		const validator = (
			await loadFactory(T, [["symbol", "key", key]], ["toJsonSchema"])
		)(key)
		attest(thrown(() => validator.toJsonSchema())).equals(
			thrown(() => T.toJsonSchema())
		)
		// the engine raising it words its message, so the build doesn't bake its own
		attest(
			precompileStandalone(
				{
					T: { type: T, params: [{ kind: "symbol", label: "key", value: key }] }
				},
				{ introspection: ["toJsonSchema"] }
			).code.includes("runtime.serializeSymbol()")
		).equals(true)
	})

	it("throws arktype's ParseError where the view of a Type its JSON Schema writes can't be created", async () => {
		// the output requires the defaulted key, which the index signature's value excludes
		const T = type({ a: "string = 'a'" }).and({ "[string]": [] })
		const { T: validator } = await load({ T }, undefined, undefined, [
			"~standard.jsonSchema"
		])
		const thrown = (t: typeof T) => {
			try {
				t["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			} catch (e) {
				return [(e as Error).constructor.name, (e as Error).message]
			}
		}
		attest(thrown(T)).snap([
			"ParseError",
			"Intersection at a of string and object results in an unsatisfiable type"
		])
		attest(thrown(validator as never)).equals(thrown(T))
		attest(
			validator["~standard"].jsonSchema.input({ target: "draft-2020-12" })
		).equals(T["~standard"].jsonSchema.input({ target: "draft-2020-12" }))
	})

	it("has none of the members that need arktype", async () => {
		const { T } = await load({ T: type("string") })
		attest(() => T.and("number")).throws.snap(
			"TypeError: T.and is not a function"
		)
		attest(["and", "in", "json", "toJsonSchema"].filter(k => k in T)).equals([])
		attest(JSON.stringify({ T })).equals("{}")
		attest(() => (runtimeType as any)("string")).throws.snap(
			"TypeError: runtimeType is not a function"
		)
		attest(Reflect.ownKeys(runtimeType)).equals(["errors"])
	})

	it("passes a writer its meta holds en's locale, configured or not", async () => {
		const write = (ctx: unknown, locale: Locale.Info) =>
			[
				locale.tag,
				locale.list(["a", "b", "c"], "or"),
				locale.plural(2),
				locale.number(1.5),
				locale.date(new Date(0)),
				locale.verbatim("v")
			].join("; ")
		const define = (w: typeof write) => type("number").configure({ message: w })
		const built = standIn(write.bind(null), "write")
		const T: StandaloneExport = {
			type: define(built),
			params: [{ kind: "function", label: "`write`", value: built }]
		}
		const unconfigured = (await load({ T })).T(write)
		const configured = (
			await load(
				{ T },
				`runtime.configure({}, "${fingerprintOf({})}")`,
				fingerprintOf({})
			)
		).T(write)
		const summary = define(write)("x").toString()
		attest([unconfigured("x").summary, configured("x").summary]).equals([
			summary,
			summary
		])
		attest(summary).snap("en; a, b or c; other; 1.5; 1970; v")
	})

	it("passes en's locale to the writers in a callback's error meta", async () => {
		const isLarge = (n: number, ctx: Traversal) =>
			n > 3 ||
			ctx.reject({
				expected: "more than 3",
				meta: {
					actual: (data, ctx, locale) => locale.number(data as number),
					problem: (ctx, locale) =>
						`${locale.tag}: ${ctx.expected} (${ctx.actual})`
				}
			})
		const built = standIn(isLarge.bind(null), "islarge")
		const create = await loadFactory(type("number").narrow(built), [
			["function", "`isLarge`", built]
		])
		const summary = type("number").narrow(isLarge)(1.5).toString()
		attest(create(isLarge)(1.5).summary).equals(summary)
		attest(summary).snap("en: more than 3 (1.5)")
	})

	it("leaves en's locale out of a validator whose callbacks are all arktype's", () => {
		const T = type({ url: "string.url", n: "string.integer.parse" })
		attest(precompileStandalone({ T }).code.includes("runtime.inEn(")).equals(
			false
		)
	})

	it("prints with the runtime's primitive printer where arktype's callbacks raise", () => {
		const T = type({ url: "string.url", n: "string.integer.parse" })
		attest(
			precompileStandalone({ T }).code.includes("runtime.printing(")
		).equals(false)
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

	it("writes a scope's configured strings for a code raised before", async () => {
		const { U, S } = await load({
			U: type("'b'"),
			S: scope({}, { unit: { expected: "an a" } }).type("'a'")
		})
		attest(U("a").summary).snap('must be "b" (was "a")')
		attest(S("b").summary).snap('must be an a (was "b")')
	})

	it("validates with the configuration its program applies", async () => {
		const config: ArkSchemaConfig = {
			domain: { message: ctx => `configured ${ctx.problem}` },
			divisor: {
				expected: (ctx, locale) => `a multiple of ${locale.number(ctx.rule)}`
			},
			onFail: errors => errors.summary
		}
		const { T } = scope(
			{ T: { a: "string", b: "number % 2" } },
			config
		).export()
		const { T: validator } = await load(
			{ T: type({ a: "string", b: "number % 2" }) },
			`runtime.configure({
	domain: { message: ctx => \`configured \${ctx.problem}\` },
	divisor: {
		expected: (ctx, locale) => \`a multiple of \${locale.number(ctx.rule)}\`
	},
	onFail: errors => errors.summary
}, "${fingerprintOf(config)}")`,
			fingerprintOf(config)
		)
		const input = { a: 1, b: 3 }
		attest(validator(input)).equals(T(input))
		attest(validator(input)).snap(
			"configured must be a string (was a number)\nb must be a multiple of 2 (was 3)"
		)
	})

	it("throws for a configuration it wasn't precompiled under", async () => {
		const built = fingerprintOf({})
		attest(await messageOf("", built)).equals(
			writeCreatedBeforeConfigureMessage("main.ts")
		)
		attest(
			await messageOf(
				`runtime.configure({ onUndeclaredKey: "delete" }, "${built}")`,
				built
			)
		).equals(configuredUnlikeBuildMessage)
		attest(
			await messageOf(`runtime.configure({ onUndeclaredKey: "delete" })`, built)
		).equals(configMismatchMessage)
		attest(await messageOf("runtime.configure({})", built)).equals(
			configMismatchMessage
		)
		attest(await messageOf(`runtime.configure({}, "${built}")`, built)).equals(
			""
		)
		const createdFirst = precompileStandalone({
			T: type("string")
		}).code.replace(
			"runtime.fixConfig()",
			"runtime.fixConfig()\nruntime.configure({})"
		)
		attest(
			await importBesideArktype(bundle(createdFirst).js)
				.then(artifact => artifact.T())
				.catch((e: Error) => e.message)
		).equals(reconfiguredMessage)
	})

	it("hashes apart a configuration's values wherever they differ", () => {
		class Custom {
			x = 1
		}
		const shared = { n: 1 }
		const advanced = /a/g
		advanced.lastIndex = 3
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		const pairs: [object, object][] = [
			[
				{ onUndeclaredKey: "delete" },
				Object.assign(Object.create({ keywords: { string: "text" } }), {
					onUndeclaredKey: "delete"
				})
			],
			[{ x: 1 }, new Custom()],
			[
				{ x: shared, y: shared },
				{ x: { n: 1 }, y: { n: 1 } }
			],
			[/a/g, advanced],
			[/a/g, /a/i],
			[{ a: 0 }, { a: -0 }],
			[{ a: 1 }, { a: 1n }],
			[{ a: "1" }, { a: 1 }],
			[new Date(0), new Date(1)],
			[cyclic, { self: {} }],
			[{ k: 2 }, { [Symbol.for("k")]: 2 }],
			[{ [Symbol("k")]: 2 }, { [Symbol.for("undefined")]: 2 }],
			[{}, Object.defineProperty({}, "x", { value: 2 })],
			[
				new Date(0),
				Object.defineProperty({ [Symbol.toStringTag]: "Date" }, "valueOf", {
					value: () => 0
				})
			]
		]
		attest(
			pairs.filter(([l, r]) => fingerprintOf(l) === fingerprintOf(r))
		).equals([])
		attest(fingerprintOf({ f: () => 1 })).equals(fingerprintOf({ f: () => 2 }))
	})

	it("throws for a configuration written before its first validator", async () => {
		const artifact = await importBesideArktype(
			bundle(
				precompileStandalone(
					{ A: type("string"), B: type("number") },
					{
						configured: {
							fingerprint: fingerprintOf({ onUndeclaredKey: "delete" }),
							path: "main.ts"
						}
					}
				).code.replace(
					runtimeImport,
					`${runtimeImport}
const config = { onUndeclaredKey: "delete" }
runtime.configure(config, "${fingerprintOf({ onUndeclaredKey: "delete" })}")
config.onUndeclaredKey = "reject"`
				)
			).js
		)
		attest(
			[artifact.A, artifact.B].map(create => {
				try {
					return create()
				} catch (e) {
					return (e as Error).message
				}
			})
		).equals([writtenConfigMessage, writtenConfigMessage])
	})

	it("writes errors with the writers configure() received", async () => {
		const { T } = await load(
			{ T: type({ a: "string" }) },
			`const domain = { expected: () => "E1" }
runtime.configure({ domain }, "${fingerprintOf({ domain: { expected: () => "" } })}")
domain.expected = () => "E2"`,
			fingerprintOf({ domain: { expected: () => "" } })
		)
		attest(T({ a: 1 }).summary).snap("a must be E1 (was a number)")
	})

	it("throws for a second configure(), even with the same values", async () => {
		const built = fingerprintOf({ numberAllowsNaN: true })
		const configured = `runtime.configure({ numberAllowsNaN: true }, "${built}")`
		attest([
			await messageOf(
				`runtime.configure({ onUndeclaredKey: "delete" })\n${configured}`,
				built
			),
			await messageOf(`${configured}\n${configured}`, built)
		]).equals([reconfiguredMessage, reconfiguredMessage])
	})

	it("creates its validators where a site first reads them", async () => {
		const config = { domain: { message: "configured" } }
		const artifact = await importBesideArktype(
			bundle(
				`${
					precompileStandalone(
						{ T: type({ a: "string" }) },
						{
							configured: {
								fingerprint: fingerprintOf(config),
								path: "main.ts"
							}
						}
					).code
				}\nexport const configure = runtime.configure`
			).js
		)
		artifact.configure(config, fingerprintOf(config))
		attest(artifact.T()({ a: 1 }).summary).snap("configured")
		attest(artifact.T()).is(artifact.T())
		attest(() => artifact.configure(config)).throws(reconfiguredMessage)
	})

	it("fixes the configuration where a Scope, Module or Generic is first read", async () => {
		const exports = {
			S: scope({ a: "string" }),
			M: scope({ a: "string" }).export(),
			G: generic(["t", "string"])({ v: "t" }),
			K: ark.export().string
		}
		for (const [name, value] of Object.entries(exports)) {
			// arktype fixes its configuration when it creates any of them
			const artifact = await importBesideArktype(
				bundle(
					`${
						precompileStandalone(
							{ [name]: value },
							{
								configured: { fingerprint: fingerprintOf({}), path: "main.ts" }
							}
						).code
					}\nexport const configure = runtime.configure`
				).js
			)
			artifact.configure({}, fingerprintOf({}))
			artifact[name]()
			attest(() => artifact.configure({})).throws(reconfiguredMessage)
		}
	})

	it("fixes the configuration where a keyword Module's Type is first read", async () => {
		const config = { domain: { message: "configured" } }
		const artifact = await importBesideArktype(
			bundle(
				`${
					precompileStandalone(
						{ Strings: type.keywords.string },
						{
							configured: {
								fingerprint: fingerprintOf(config),
								path: "main.ts"
							},
							keywordReads: new Set(["Strings"])
						}
					).code
				}\nexport const configure = runtime.configure`
			).js
		)
		// arktype creates a keyword's Type when it's first read
		const strings = artifact.Strings()
		attest(strings.json).is(strings.json)
		attest(artifact.Strings()).is(strings)
		artifact.configure(config, fingerprintOf(config))
		attest(strings.email(1).summary).snap("configured")
		attest(() => artifact.configure(config)).throws(reconfiguredMessage)
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

	it("validates cyclic data as a module's types", async () => {
		const M = type.module({
			a: { "b?": "b", "self?": "a" },
			b: { "a?": "a", c: "string" },
			Node: type({ value: "number", "next?": "this" }),
			tree: { value: "number", "children?": "tree[]" },
			"Tree<t>": { value: "t", "children?": "Tree<t>[]" },
			Trees: "Tree<number>"
		})
		const { M: validators } = await load({ M })
		const a: any = { b: { c: "x" } }
		a.self = a
		a.b.a = a
		const bad: any = { b: { c: 1 } }
		bad.self = bad
		bad.b.a = bad
		const node: any = { value: 1 }
		node.next = node
		const tree: any = { value: 1, children: [] }
		tree.children.push(tree, { value: "2" })
		const inputs = [a, bad, node, { value: 1, next: { value: "2" } }, tree]
		for (const name of ["a", "b", "Node", "tree", "Trees"] as const) {
			const t: type.Any = M[name]
			for (const input of inputs) {
				attest(observe(validators[name](input), input)).equals(
					observe(t(input), input)
				)
			}
		}
	})

	it("exports a Scope or Generic as an empty object", async () => {
		const $ = scope({ "box<t>": { box: "t" }, a: "string" })
		const Box = type("<t>", { box: "t" })
		const { $: standIn, Box: box, M } = await load({ $, Box, M: $.export() })
		attest(standIn).equals({})
		attest(() => box("string")).throws.snap("TypeError: box is not a function")
		attest(M.box).equals({})
		attest(M.a("x")).equals("x")
		// an artifact without validators still declares its stand-ins and the Modules holding them
		const { Boxes } = await load({
			Boxes: scope({ "box<t>": { box: "t" } }).export()
		})
		attest(Boxes).equals({ box: {} })
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
		const Even = scope({}, { divisor: { message: "odd" } }).type("number % 2")
		const Long = type("string").atLeastLength(3)
		const Box = type("<t>", { box: "t" })
		const artifact = await load({ T, M, Even, Long, $: scope({}), Box })
		const { T: validator, M: module } = artifact
		const prototype = Object.getPrototypeOf(validator)
		const config = artifact.Even(1).config
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
			scope: () => (artifact.$.x = 1),
			generic: () => (artifact.Box.x = 1),
			config: () => (config.jitless = false),
			configuredWriters: () => (config.divisor.message = "even"),
			locale: () => (config.locale.problem = () => "odd"),
			// en's writers of the codes a validator raises, which every config inherits
			registeredWriters: () =>
				(Object.getPrototypeOf(Object.getPrototypeOf(config)).divisor = {}),
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
		}).code.replace(`"arktype/runtime"`, JSON.stringify(runtimeUrl))
		const { freeze, assign, setPrototypeOf } = Object
		Object.assign(Object, {
			freeze: (o: object) => o,
			assign: (o: object) => o,
			setPrototypeOf: (o: object) => o
		})
		try {
			const M = (await importBesideArktype(source)).M()
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
		attest(() =>
			precompileStandalone({ T: type.enumerated(type({ a: "string" })) })
		).throws(writeUnprecompilableMessage("the unit Type<{ a: string }>"))
		attest(() => precompileStandalone({ "\uD800": type("string") })).throws(
			writeUnprecompilableMessage('the export name "\\ud800"')
		)
		const T = scope({}, { domain: { message: () => "configured" } }).type(
			"string"
		)
		attest(() => precompileStandalone({ T })).throws(
			writeUnprecompilableMessage("a configured domain message")
		)
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		attest(() =>
			precompileStandalone({
				T: type("string").configure({ cyclic } as never)
			})
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
		).throws(writeUnprecompilableMessage('the accessor "x"'))
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
			hole: refusalOf(new Array(1)),
			extra: refusalOf(Object.assign([1], { x: 1 })),
			hidden: refusalOf(Object.defineProperty({}, "x", { value: 1 })),
			symbol: refusalOf({ [Symbol("x")]: 1 }),
			date: refusalOf(Object.assign(new Date(0), { x: 1 })),
			regex: refusalOf(Object.assign(/x/, { x: 1 }))
		}).equals({
			fakeDate: writeUnprecompilableMessage("an instance of Date"),
			fakeRegExp: writeUnprecompilableMessage("an instance of RegExp"),
			map: writeUnprecompilableMessage("an instance of Map"),
			hole: writeUnprecompilableMessage(
				"an array with holes or other properties"
			),
			extra: writeUnprecompilableMessage(
				"an array with holes or other properties"
			),
			hidden: writeUnprecompilableMessage('the non-enumerable property "x"'),
			symbol: writeUnprecompilableMessage("the symbol key Symbol(x)"),
			date: writeUnprecompilableMessage("a Date with its own properties"),
			regex: writeUnprecompilableMessage("a RegExp with its own properties")
		})
	})

	it("refuses a configured writer only for a Type raising its code", async () => {
		// both metas hold one object, so one creation makes both Types
		const shared = { note: "shared" }
		const Quiet = scope({}, { domain: { message: () => "configured" } })
			.type("unknown")
			.configure({ shared } as never)
		const Loud = scope({})
			.type("string")
			.configure({ shared } as never)
		const loaded = await load({ Quiet, Loud })
		attest([
			loaded.Quiet(5),
			loaded.Loud(5).summary,
			loaded.Quiet.meta.shared === loaded.Loud.meta.shared
		]).equals([5, "must be a string (was a number)", true])
	})

	it("refuses a configured intersection writer for any Type", () => {
		const T = scope({}, { intersection: { message: () => "configured" } }).type(
			"string >= 5 & /^a/"
		)
		attest(() => precompileStandalone({ T })).throws(
			writeUnprecompilableMessage("a configured intersection message")
		)
	})

	it("rejects a configured locale", () => {
		// a build checks that nothing configured its thread, so it's left as it was
		const config = $ark.config
		$ark.config = { ...config, locale: de }
		try {
			attest(() => precompileStandalone({ T: type("string") })).throws(
				writeUnprecompilableMessage("a configured locale")
			)
		} finally {
			$ark.config = config
		}
	})

	it("writes errors only in en", async () => {
		const { T } = await load({ T: type("string") })
		const errors = T(1)
		attest(() => errors.toLocaleString(de)).throws(unrenderedLocaleMessage)
		attest(errors.toLocaleString()).equals(errors.summary)
	})

	it("writes errors only in en beside a runtime island", async () => {
		const { js } = bundle(`${precompileStandalone({ T: type("string") }).code}
import "arktype/internal/island.js"
import { type } from "arktype"
export { de } from "arktype/locales/de"
export const Island = type("string")`)
		const artifact = await importBesideArktype(js)
		const errors = artifact.T()(1)
		attest(() => errors.toLocaleString(artifact.de)).throws(
			unrenderedLocaleMessage
		)
		attest(errors.summary).snap("must be a string (was a number)")
		attest(artifact.Island(1).toLocaleString(artifact.de)).snap(
			"muss eine Zeichenkette sein, ist aber eine Zahl"
		)
	})

	it("writes an island's errors in any locale, with those its morph returns", async () => {
		const { js } = bundle(`${precompileStandalone({ T: type("string") }).code}
import "arktype/internal/island.js"
import { type } from "arktype"
export { messageIn } from "arktype"
export { de } from "arktype/locales/de"
export const Island = type(["unknown", "unknown"]).pipe(([d, validate]) => validate(d))`)
		const artifact = await importBesideArktype(js)
		const errors = artifact.Island([1, artifact.T()])
		attest([
			errors.toLocaleString(artifact.de),
			artifact.messageIn(errors.issues[0], artifact.de)
		]).snap([
			"muss eine Zeichenkette sein, ist aber eine Zahl",
			"muss eine Zeichenkette sein, ist aber eine Zahl"
		])
	})

	describe("factories", () => {
		it("creates a validator from the holes it receives", async () => {
			const trim = (s: string) => s.trim()
			const isEven = (n: number) => n % 2 === 0
			class Animal {}
			class Dog extends Animal {}
			const tag = Symbol("tag")
			const define = (t: typeof trim, e: typeof isEven, D: typeof Dog) =>
				type({
					name: type("string").pipe(t),
					n: type("number").narrow(e),
					pet: type.instanceOf(D),
					[tag]: "string"
				})
			const T = define(trim, isEven, Dog)
			const built = [
				standIn(trim.bind(null), "trim"),
				standIn(isEven.bind(null), "iseven"),
				standIn(class extends Animal {}, "dog")
			] as const
			const create = await loadFactory(define(...built), [
				["function", "`trim`", built[0]],
				["function", "`isEven`", built[1]],
				["class", "`Dog`", built[2]],
				["symbol", "`tag`", tag]
			])
			const validator = create(trim, isEven, Dog, tag)
			const inputs = [
				{ name: " a ", n: 2, pet: new Dog(), [tag]: "x" },
				{ name: 1, n: 3, pet: new Animal(), [tag]: 1 },
				{}
			]
			for (const input of inputs) {
				attest(observe(validator(input), input)).equals(
					observe(T(input), input)
				)
			}
			attest([validator.expression, validator.description]).equals([
				T.expression,
				T.description
			])
		})

		it("prints the names of the holes it receives", async () => {
			const isEven = standIn((n: number) => n % 2 === 0, "iseven")
			const create = await loadFactory(type("number").narrow(isEven), [
				["function", "`isEven`", isEven]
			])
			const isDivisibleBy2 = (n: number) => n % 2 === 0
			attest(create(isDivisibleBy2)(1).toString()).snap(
				"must be valid according to isDivisibleBy2 (was 1)"
			)
			attest(create(isDivisibleBy2).expression).snap("number")
			attest(create((n: number) => n % 2 === 0).description).snap(
				"a number and valid according to an anonymous predicate"
			)
		})

		it("checks the facts it was precompiled for", async () => {
			const isEven = (n: number) => n % 2 === 0
			class Animal {}
			class Dog extends Animal {}
			const tag = Symbol("tag")
			const BuiltAnimal = standIn(class {}, "animal")
			const BuiltDog = standIn(class extends BuiltAnimal {}, "dog")
			const builtIsEven = standIn(isEven.bind(null), "iseven")
			const create = await loadFactory(
				type({
					n: type("number").narrow(builtIsEven),
					pet: type.instanceOf(BuiltDog),
					owner: type.instanceOf(BuiltAnimal),
					[tag]: "string"
				}),
				[
					["function", "`isEven`", builtIsEven],
					["class", "`Dog`", BuiltDog],
					["class", "`Animal`", BuiltAnimal],
					["symbol", "`tag`", tag]
				]
			)
			const Cat = function () {}
			Object.setPrototypeOf(Cat.prototype, Animal.prototype)
			attest(create(isEven, Cat, Animal, Symbol("tag")).expression).snap(
				"{ n: number, owner: Animal, pet: Cat, Symbol(tag): string }"
			)
			attest(() =>
				create((n: number, ctx: unknown) => !!ctx, Dog, Animal, Symbol("tag"))
			).throws(
				writeCreationMismatchMessage(
					"`isEven`",
					"a function of 2 or more parameters",
					"a function of 1 parameter"
				)
			)
			attest(() => create(isEven, class {}, Animal, Symbol("tag"))).throws(
				writeCreationMismatchMessage(
					"`Dog`",
					"a class",
					"a class extending `Animal`"
				)
			)
			attest(() => create(isEven, Map, Animal, Symbol("tag"))).throws(
				writeCreationMismatchMessage(
					"`Dog`",
					"the builtin Map",
					"a class extending `Animal`"
				)
			)
			attest(() => create(Symbol("tag"), Dog, Animal, Symbol("tag"))).throws(
				writeCreationMismatchMessage(
					"`isEven`",
					"Symbol(tag)",
					"a function of 1 parameter"
				)
			)
			attest(() => create(isEven, Dog, Animal, Symbol("other"))).throws(
				writeCreationMismatchMessage("`tag`", "Symbol(other)", "Symbol(tag)")
			)
		})

		it("takes the holes of a validator it receives", async () => {
			const trim = (s: string) => s.trim()
			const builtTrim = standIn(trim.bind(null), "trim")
			const Name = type("string").pipe(builtTrim)
			const User = type({ name: Name })
			const validators = await load({
				Name: {
					type: Name,
					params: [{ kind: "function", label: "`trim`", value: builtTrim }]
				},
				User: {
					type: User,
					params: [{ kind: "input", label: "Name", reads: [[[], Name]] }]
				},
				Text: type("string"),
				Described: {
					type: type("string").pipe(builtTrim).describe("a name"),
					params: [{ kind: "function", label: "`trim`", value: builtTrim }]
				}
			})
			const create = validators.User
			attest(create(validators.Name(trim))({ name: " a " })).equals({
				name: "a"
			})
			attest(
				create(validators.Name((s: string) => s.toUpperCase()))({ name: "a" })
			).equals({ name: "A" })
			attest(() => create(validators.Text)).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"Type<string>",
					"Type<(In: string) => Out<unknown>>"
				)
			)
			attest(() => create(validators.Described(trim))).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"another Type<(In: string) => Out<unknown>>",
					"Type<(In: string) => Out<unknown>>"
				)
			)
		})

		it("takes the holes of a Scope it receives", async () => {
			const isLong = (s: string) => s.length > 1
			const define = (fn: typeof isLong) => {
				const $ = scope({ a: ["string", ":", fn], b: { a: "a" } })
				return { $, B: $.type("b"), M: $.export() }
			}
			const built = standIn(isLong.bind(null), "long")
			const { $, B, M } = define(built)
			const received: FactoryParam = {
				kind: "input",
				label: "$",
				reads: [[[], $]]
			}
			const created = await load({
				S: {
					type: $,
					params: [{ kind: "function", label: "`isLong`", value: built }]
				},
				B: { type: B, params: [received] },
				M: { type: M, params: [received] },
				Other: scope({ a: "string" })
			})
			const original = define(isLong)
			const $$ = created.S(isLong)
			for (const input of [{ a: "x" }, { a: "xy" }]) {
				attest(observe(created.B($$)(input), input)).equals(
					observe(original.B(input), input)
				)
				attest(observe(created.M($$).b(input), input)).equals(
					observe(original.M.b(input), input)
				)
			}
			attest(() => created.B(created.Other)).throws.snap(
				"Error: `$` is another Scope, but was precompiled as the Scope it was at build"
			)
		})

		it("tells a Scope it receives from one differing only in what decides its Types", async () => {
			const short = standIn((s: string) => s.length < 3, "short")
			const long = standIn((s: string) => s.length > 3, "long")
			const holes: FactoryParam[] = [
				{ kind: "function", label: "`short`", value: short },
				{ kind: "function", label: "`long`", value: long }
			]
			const repeating = (last: Function) =>
				scope({
					a: ["string", ":", short],
					b: ["string", ":", long],
					s: ["string", ":", last as never]
				})
			const pairs: [Scope<any>, Scope<any>][] = [
				[
					scope({ s: "string" }, { exactOptionalPropertyTypes: false }),
					scope({ s: "string" }, { exactOptionalPropertyTypes: true })
				],
				[repeating(short), repeating(long)],
				// where a nested definition ends
				[
					scope({ s: "string", o: { a: { b: "s" }, c: "number" } }),
					scope({ s: "string", o: { a: { b: "s", c: "number" } } })
				],
				[
					scope({ s: "string", o: [["s", "number"]] }),
					scope({ s: "string", o: ["s", "number"] })
				],
				// a Generic alias, which arktype holds as a function it calls
				[
					scope({ s: "string", "Box<t>": { v: "t" } }),
					scope({ s: "string", "Box<t>": { v: "t[]" } })
				],
				[
					scope({ s: "string", Box: generic("t")({ v: "t" }) }),
					scope({ s: "string", Box: generic("t")({ v: "t[]" }) })
				]
			]
			for (const [$, other] of pairs) {
				const created = await load({
					Other: { type: other, params: holes },
					B: {
						type: $.type({ "b?": "s" }),
						params: [{ kind: "input", label: "$", reads: [[[], $]] }]
					}
				})
				attest(() => created.B(created.Other(short, long))).throws(
					"`$` is another Scope, but was precompiled as the Scope it was at build"
				)
			}
		})

		it("writes once what a factory creates from a Type it receives, whose meta its errors copy", async () => {
			const isEven = standIn((n: number) => n % 2 === 0, "even")
			const $ = scope({ even: ["number", ":", isEven], s: "string" })
			const U = $.type({ name: "s" })
			// a domain's errors carry the meta of the root it is
			const Name = type("string").configure({ description: "a name" })
			const receives = (label: string, t: type.Any) => [
				{ kind: "input" as const, label, reads: [[[], t]] as [[], unknown][] }
			]
			const exports: Record<string, StandaloneExport> = {
				$: {
					type: $,
					params: [{ kind: "function", label: "`isEven`", value: isEven }]
				},
				U: { type: U, params: receives("$", $ as never) },
				Name,
				Derived: { type: U.and({ a: "s" }), params: receives("U", U) },
				Exposing: { type: type({ n: Name }), params: receives("Name", Name) }
			}
			// a folded factory returns what the creations wrote, rekeyed with the holes it receives
			attest(
				precompileStandalone(exports)
					.code.split("function factory")
					.slice(1)
					.map(factory => factory.includes("??= create"))
			).equals([false, true, true, true])
			const created = await load(exports)
			const holder = created.$(isEven)
			attest(
				created.Derived(created.U(holder))({ name: "x", a: 1 }).toString()
			).snap("a must be a string (was a number)")
			attest(created.Exposing(created.Name)({ n: 5 }).issues[0].meta).equals(
				created.Name.meta
			)
		})

		it("shares one function between folded factories alike but for where their creation holds their Type", async () => {
			const isEven = standIn((n: number) => n % 2 === 0, "even")
			const $ = scope({ even: ["number", ":", isEven], s: "string" })
			const receives = (label: string) => [
				{ kind: "input" as const, label, reads: [[[], $]] as [[], unknown][] }
			]
			const exports: Record<string, StandaloneExport> = {
				$: {
					type: $,
					params: [{ kind: "function", label: "`isEven`", value: isEven }]
				},
				A: { type: $.type({ a: "s" }), params: receives("$") },
				B: { type: $.type({ b: "s" }), params: receives("$") },
				// its check prints another label
				C: { type: $.type({ c: "s" }), params: receives("other") }
			}
			attest(precompileStandalone(exports).folds).equals({
				A: ["A", 0],
				B: ["A", 1]
			})
			const created = await load(exports)
			const holder = created.$(isEven)
			attest(created.B(holder)({ b: 3 }).toString()).snap(
				"b must be a string (was a number)"
			)
			attest(created.C(holder)({ c: 3 }).toString()).snap(
				"c must be a string (was a number)"
			)
		})

		it("checks a class's lineage against the classes of the Types it receives", async () => {
			class Animal {}
			class Dog extends Animal {}
			class Stray {}
			const BuiltAnimal = standIn(class {}, "animal")
			const BuiltDog = standIn(class extends BuiltAnimal {}, "dog")
			const AnimalT = type.instanceOf(BuiltAnimal)
			const DogT = type.instanceOf(BuiltDog)
			const created = await load({
				AnimalT: {
					type: AnimalT,
					params: [{ kind: "class", label: "`Animal`", value: BuiltAnimal }]
				},
				DogT: {
					type: DogT,
					params: [{ kind: "class", label: "`Dog`", value: BuiltDog }]
				},
				// arktype keeps only Dog, since it extends Animal
				Narrowed: {
					type: type.instanceOf(BuiltDog).and(AnimalT),
					params: [
						{ kind: "class", label: "`Dog`", value: BuiltDog },
						{ kind: "input", label: "AnimalT", reads: [[[], AnimalT]] }
					]
				},
				Widened: {
					type: type.instanceOf(BuiltAnimal).and(DogT),
					params: [
						{ kind: "class", label: "`Animal`", value: BuiltAnimal },
						{ kind: "input", label: "DogT", reads: [[[], DogT]] }
					]
				}
			})
			const animalT = created.AnimalT(Animal)
			attest(created.Narrowed(Dog, animalT).expression).equals("Dog")
			attest(created.Widened(Animal, created.DogT(Dog)).expression).equals(
				"Dog"
			)
			// arktype throws once Dog doesn't extend Animal, since nothing is both
			attest(() => created.Narrowed(Stray, animalT)).throws(
				writeCreationMismatchMessage(
					"`Dog`",
					"a class",
					"a class extending `AnimalT`'s hole 0"
				)
			)
			attest(() => created.Widened(Animal, created.DogT(Stray))).throws(
				writeCreationMismatchMessage(
					"`DogT`'s hole 0",
					"a class",
					"a class extending `Animal`"
				)
			)
			attest(() => created.Narrowed(Dog, created.DogT(Dog))).throws(
				writeCreationMismatchMessage(
					"`AnimalT`",
					"Type<Dog>",
					"the Type it was at build"
				)
			)
		})

		it("applies defaults with the functions it receives", async () => {
			const now = () => new Date(0)
			const invalid = () => "x" as never
			const shout = (s: string, ctx: unknown) => (ctx ? `${s}!` : s)
			const greeting = () => "hi"
			const empty = () => []
			const define = (
				n: typeof now,
				i: typeof invalid,
				s: typeof shout,
				g: typeof greeting,
				e: typeof empty
			) => ({
				Thunk: type({ at: ["Date", "=", n], n: "number = 1" }),
				// `unknown.any` is another node of the id `unknown` has
				Any: type({ at: ["unknown", "=", n], n: "unknown.any" }),
				Invalid: type({ n: ["number", "=", i] }),
				Element: type(["string", ["Date", "=", n]]),
				Contextual: type({ s: [type("string").pipe(s), "=", g] }),
				Transforming: type({ name: ["string.trim", "=", " a "] }),
				Empty: type({ values: "string[] = []", meta: "object = {}" }),
				Tree: scope({
					tree: { name: "string = 'root'", children: ["tree[]", "=", e] }
				}).export().tree
			})
			const types = define(now, invalid, shout, greeting, empty)
			const built = [
				standIn(now.bind(null), "now"),
				standIn(invalid.bind(null), "invalid"),
				standIn(shout.bind(null), "shout"),
				standIn(greeting.bind(null), "greeting"),
				standIn(empty.bind(null), "empty")
			] as const
			const builtTypes = define(...built)
			const created = await load({
				Thunk: {
					type: builtTypes.Thunk,
					params: [{ kind: "function", label: "`now`", value: built[0] }]
				},
				Any: {
					type: builtTypes.Any,
					params: [{ kind: "function", label: "`now`", value: built[0] }]
				},
				Invalid: {
					type: builtTypes.Invalid,
					params: [{ kind: "function", label: "`invalid`", value: built[1] }]
				},
				Element: {
					type: builtTypes.Element,
					params: [{ kind: "function", label: "`now`", value: built[0] }]
				},
				Contextual: {
					type: builtTypes.Contextual,
					params: [
						{ kind: "function", label: "`shout`", value: built[2] },
						{ kind: "function", label: "`greeting`", value: built[3] }
					]
				},
				Transforming: builtTypes.Transforming,
				Empty: builtTypes.Empty,
				Tree: {
					type: builtTypes.Tree,
					params: [{ kind: "function", label: "`empty`", value: built[4] }]
				}
			})
			const validators: Record<string, (data: unknown) => unknown> = {
				Thunk: created.Thunk(now),
				Any: created.Any(now),
				Invalid: created.Invalid(invalid),
				Element: created.Element(now),
				Contextual: created.Contextual(shout, greeting),
				Transforming: created.Transforming,
				Empty: created.Empty,
				Tree: created.Tree(empty)
			}
			const inputs = [{}, ["a"], { at: new Date(1), n: 2 }, { children: [{}] }]
			for (const [name, t] of Object.entries(types)) {
				for (const input of inputs) {
					attest(observe(validators[name](input), input)).equals(
						observe(t(input), input)
					)
				}
			}
			attest(created.Thunk(() => new Date(1))({})).equals({
				at: new Date(1),
				n: 1
			})
			attest(created.Empty({}).values !== created.Empty({}).values).equals(true)
		})

		it("doesn't fill a default again while traversing the value it filled in", async () => {
			const empty = () => []
			const define = (e: typeof empty): type.Any =>
				type({ "p1?": ["this", "&", { p1: ["string[]", "=", e] }] } as never)
			const built = standIn(empty.bind(null), "empty")
			const create = await loadFactory(define(built), [
				["function", "`empty`", built]
			])
			const input = { p1: {} }
			attest(Object.keys(create(empty)(input).p1.p1)).equals(
				Object.keys((define(empty)(input) as any).p1.p1)
			)
		})

		it("checks a default against the functions it receives as it creates the validator", async () => {
			// in place of a narrow the build can't call, so arktype finds the default valid
			const isEven = standIn((n: number) => n === n, "iseven")
			const T = type({ a: [["number", ":", isEven], "=", 3] })
			const optional = T.internal.references.find(node =>
				node.hasKind("optional")
			)!
			const { T: create } = await load({
				T: {
					type: T,
					params: [{ kind: "function", label: "`isEven`", value: isEven }],
					defaultChecks: [[optional.value, 3, "a"]]
				}
			})
			attest(create((n: number) => n > 0)({})).equals({ a: 3 })
			attest(() =>
				create(function isEven(n: number) {
					return n % 2 === 0
				})
			).throws.snap(
				"ParseError: Default for a must be valid according to isEven (was 3)"
			)
		})

		it("throws for data no case of a matcher asserting its default matches", async () => {
			const length = standIn((s: string) => s.length, "length")
			const negate = standIn((n: number) => -n, "negate")
			const create = await loadFactory(
				match({ string: length, number: negate, default: "assert" }) as never,
				[
					["function", "`length`", length],
					["function", "`negate`", negate]
				]
			)
			const matcher = create(
				(s: string) => s.length,
				(n: number) => -n
			)
			attest([matcher("abc"), matcher(2)]).equals([3, -2])
			attest(() => matcher(true)).throws.snap(
				"TraversalError: must be a string or a number (was boolean)"
			)
		})

		it("wraps the function it receives as a TypedFn", async () => {
			const length = standIn((s: string) => s.length, "length")
			const create = await loadFactory(
				type.fn("string", ":", "number")(length) as never,
				[["function", "`length`", length]]
			)
			const count = create(function count(s: string) {
				return s.length
			})
			attest([count("abc"), count.name, count.expression]).equals([
				3,
				"bound typed count",
				"(string) => number"
			])
			attest(() => count(1)).throws.snap(
				"TraversalError: value at [0] must be a string (was a number)"
			)
			attest(() => create((s: string) => s)("b")).throws.snap(
				"TraversalError: must be a number (was a string)"
			)
		})

		it("checks the names of a validator's holes are those it printed", async () => {
			const isLong = (s: string) => s.length > 3
			const builtIsLong = standIn(isLong.bind(null), "islong")
			const Name = type("string").narrow(builtIsLong)
			const created = await load({
				Name: {
					type: Name,
					params: [{ kind: "function", label: "`isLong`", value: builtIsLong }]
				},
				User: {
					type: type({ name: Name }),
					params: [{ kind: "input", label: "Name", reads: [[[], Name]] }]
				}
			})
			const name = created.Name(isLong)
			attest(created.User(name).description).equals(
				"{ name: a string and valid according to isLong }"
			)
			// arktype printed isLong in name's strings when it was created
			Object.defineProperty(isLong, "name", { value: "renamed" })
			attest(() => created.User(name)).throws(
				writeRenamedHoleMessage("`Name`", 0, '"renamed"', '"isLong"')
			)
		})

		it("checks a hole it receives twice is one value", async () => {
			const isLong = (s: string) => s.length > 3
			const builtIsLong = standIn(isLong.bind(null), "islong")
			const Name = type("string").narrow(builtIsLong)
			const created = await load({
				Name: {
					type: Name,
					params: [{ kind: "function", label: "`isLong`", value: builtIsLong }]
				},
				User: {
					type: type({ name: Name, nick: type("string").narrow(builtIsLong) }),
					params: [
						{ kind: "input", label: "Name", reads: [[[], Name]] },
						{ kind: "function", label: "`fns.check`", value: builtIsLong }
					]
				}
			})
			const name = created.Name(isLong)
			attest(created.User(name, isLong).description).equals(
				"{ name: a string and valid according to isLong, nick: a string and valid according to isLong }"
			)
			attest(() => created.User(name, (s: string) => s.length > 100)).throws(
				writeIdentityMismatchMessage("`fns.check`", "`Name`'s hole 0")
			)
		})

		it("checks the holes of Types another module supplies are distinct", async () => {
			// a mock can make the Types two imports read hold one function, which the build compiled as two
			const isLong = (s: string) => s.length > 3
			const isShort = (s: string) => s.length < 3
			const builtIsLong = standIn(isLong.bind(null), "islong")
			const builtIsShort = standIn(isShort.bind(null), "isshort")
			const Long = type("string").narrow(builtIsLong)
			const Short = type("string").narrow(builtIsShort)
			const created = await load({
				Long: {
					type: Long,
					params: [{ kind: "function", label: "`isLong`", value: builtIsLong }]
				},
				Short: {
					type: Short,
					params: [
						{ kind: "function", label: "`isShort`", value: builtIsShort }
					]
				},
				Pair: {
					type: type({ long: Long, short: Short }),
					params: [
						{ kind: "input", label: "Long", reads: [[[], Long]] },
						{ kind: "input", label: "Short", reads: [[[], Short]] }
					],
					distinct: [builtIsLong, builtIsShort]
				}
			})
			const Pair = created.Pair(created.Long(isLong), created.Short(isShort))
			attest(Pair({ long: "abcd", short: "a" })).equals({
				long: "abcd",
				short: "a"
			})
			attest(() =>
				created.Pair(created.Long(isLong), created.Short(isLong))
			).throws(
				writeCreationMismatchMessage(
					"`Short`'s hole 0",
					"`Long`'s hole 0",
					"another value"
				)
			)
		})

		it("selects the factory compiled for the parameter count of a function it receives", async () => {
			// arktype passes a predicate of other than 1 parameter its context, so each count is a variant
			const one = standIn((s: string) => s.length > 1, "check")
			const two = standIn((s: string, ctx: unknown) => !!ctx, "check")
			const variantOf = (check: Function): StandaloneFactory => ({
				type: type("string").narrow(check as never),
				params: [{ kind: "function", label: "`check`", value: check }],
				selected: [check]
			})
			const created = await load({
				T: {
					variants: [variantOf(one), variantOf(two)],
					selecting: [0],
					variantsByCounts: [1, 0, 1]
				}
			})
			const isLong = (s: string) => s.length > 1
			const rejects = (s: string, ctx: any) => ctx.reject("long")
			attest(created.T(isLong)("a").toString()).snap(
				'must be valid according to isLong (was "a")'
			)
			attest(created.T(rejects)("a").toString()).snap('must be long (was "a")')
			// a builtin is a function like any other, which arktype passes its context by its length
			attest(created.T(Boolean)("").toString()).snap(
				'must be valid according to Boolean (was "")'
			)
			attest(() => created.T("isLong" as never)).throws(
				writeCreationMismatchMessage("`check`", '"isLong"', "a function")
			)
		})

		it("writes the nodes a factory's variants share once", () => {
			const one = standIn((o: object) => !!o, "check")
			const two = standIn((o: object, ctx: unknown) => !!ctx, "check")
			const variantOf = (check: Function): StandaloneFactory => ({
				type: type({ name: "string" }).narrow(check as never),
				params: [{ kind: "function", label: "`check`", value: check }],
				selected: [check]
			})
			const code = precompileStandalone({
				T: {
					variants: [variantOf(one), variantOf(two)],
					selecting: [0],
					variantsByCounts: [1, 0, 1]
				}
			}).code
			// each variant's predicate holds a stand-in of its own for the one function a call receives, so only the intersections calling it apart are written twice
			attest(
				code.match(
					/(?<=const )(intersection|structure|predicate|required)(?=\w*Allows = )/g
				)
			).snap([
				"intersection",
				"intersection",
				"structure",
				"predicate",
				"required"
			])
		})

		it("checks the functions one expression created are named alike", async () => {
			// as a factory like `longer(n)` creates them, each under the placeholder of the expression creating it
			const longer = (n: number) =>
				standIn((s: string) => s.length > n, "longer")
			const longer3 = longer(3)
			const longer1 = longer(1)
			const create = await loadFactory(
				type("string").narrow(longer3).narrow(longer1),
				[
					["function", "`longer(3)`", longer3],
					["function", "`longer(1)`", longer1]
				]
			)
			const named = (name: string) =>
				Object.defineProperty((s: string) => s.length > 0, "name", {
					value: name
				})
			attest(create(named("isA"), named("isA"))("abc")).equals("abc")
			attest(() => create(named("isA"), named("isB"))).throws(
				writeCreationMismatchMessage("`longer(1)`", '"isB"', '"isA"')
			)
		})

		it("compares the inputs it receives with what the build read", async () => {
			const o = {
				name: "string" as const,
				tags: ["string"] as const,
				at: new Date(0)
			}
			const T = type({ name: o.name, tags: o.tags }).and({
				at: type("Date").atOrAfter(o.at)
			})
			const { T: create } = await load({
				T: {
					type: T,
					params: [
						{
							kind: "input",
							label: "o",
							reads: [
								[["name"], o.name],
								[["tags"], o.tags],
								[["at"], o.at]
							]
						}
					]
				}
			})
			attest(create(o)({ name: "a", tags: ["b"], at: new Date(1) })).equals({
				name: "a",
				tags: ["b"],
				at: new Date(1)
			})
			attest(() => create({ ...o, name: "number" })).throws(
				writeCreationMismatchMessage("`o.name`", '"number"', '"string"')
			)
			attest(() => create({ ...o, tags: ["string", "number"] })).throws(
				writeCreationMismatchMessage(
					"`o.tags`",
					"an array of length 2",
					"an array of length 1"
				)
			)
			attest(() => create({ ...o, at: new Date(1) })).throws(
				writeCreationMismatchMessage("`o.at`", "a Date at 1", "a Date at 0")
			)
		})

		it("creates a Module, Scope or Generic anew at each call", async () => {
			const created = await load({
				M: { type: scope({ a: "string", b: { a: "a" } }).export(), params: [] },
				S: { type: scope({ a: "string" }), params: [] },
				G: { type: type("<t>", { box: "t" }), params: [] }
			})
			const [m1, m2] = [created.M(), created.M()]
			attest([m1 === m2, m1.a === m2.a, m1.b({ a: "x" })]).equals([
				false,
				false,
				{ a: "x" }
			])
			attest(created.S() === created.S()).equals(false)
			attest(created.G() === created.G()).equals(false)
		})

		it("returns the validator it created for the same holes where arktype returns one Type", async () => {
			const isLong = standIn((s: string) => s.length > 1, "long")
			const T = type("string").narrow(isLong)
			const params = [
				{ kind: "function" as const, label: "`isLong`", value: isLong }
			]
			const created = await load({
				A: { type: T, params, internedBy: 0 },
				B: { type: T, params, internedBy: 0 },
				C: { type: T, params }
			})
			const hasTwo = (s: string) => s.length > 1
			const hasThree = (s: string) => s.length > 2
			attest([
				created.A(hasTwo) === created.A(hasTwo),
				created.A(hasTwo) === created.B(hasTwo),
				created.A(hasTwo) === created.A(hasThree),
				created.C(hasTwo) === created.C(hasTwo)
			]).equals([true, true, false, false])
		})

		it("checks each helper is the function its module registered", async () => {
			const { T: create } = await load({
				T: {
					type: type("string"),
					params: [
						{
							kind: "helper",
							label: "`list`",
							file: "helpers.ts",
							name: "list"
						}
					]
				}
			})
			const list = (def: string) => `${def}[]`
			const expected = "the function helpers.ts exports as `list`"
			// a module a test runner replaced never registered what it exports
			attest(() => create(list)).throws(
				writeCreationMismatchMessage("`list`", "Function(list)", expected)
			)
			const registry = Symbol.for("arktype.helpers")
			Reflect.set(globalThis, registry, {
				"helpers.ts": { __proto__: null, list }
			})
			try {
				attest(create(list)("a")).equals("a")
				attest(() => create((def: string) => def)).throws(
					writeCreationMismatchMessage("`list`", "Function(fn)", expected)
				)
			} finally {
				Reflect.deleteProperty(globalThis, registry)
			}
		})

		it("binds the functions it receives in the order arktype sorts their names in", async () => {
			const isEven = standIn((n: number) => n % 2 === 0, "a", "isEven")
			const isSmall = standIn((n: number) => n < 10, "b", "isSmall")
			const { T: create } = await load({
				T: {
					type: type("number")
						.narrow(isSmall)
						.or(type("number").narrow(isEven)),
					params: [
						{ kind: "function", label: "`isSmall`", value: isSmall },
						{ kind: "function", label: "`isEven`", value: isEven }
					]
				}
			})
			const calls: string[] = []
			const even = (n: number) => calls.push("even") && n % 2 === 0
			const small = (n: number) => calls.push("small") && n < 10
			attest(create(small, even)(11.5).toString()).snap(
				"must be valid according to even or valid according to small (was 11.5)"
			)
			// renamed so it sorts after the other, unlike the function it was built for
			const whole = (n: number) => calls.push("whole") && Number.isInteger(n)
			attest(create(small, whole)(11.5).toString()).snap(
				"must be valid according to small or valid according to whole (was 11.5)"
			)
			// arktype calls each branch's narrow once to tell whether it allows the data and once to write its error
			attest(calls).equals([
				"even",
				"small",
				"even",
				"small",
				"small",
				"whole",
				"small",
				"whole"
			])
			// arktype prints branches alike but for their names once where the names are equal
			const [unnamedSmall, unnamedEven] = [
				(n: number) => n < 10,
				(n: number) => n % 2 === 0
			]
			const Unnamed = create(unnamedSmall, unnamedEven)
			attest(Unnamed.description).snap(
				"a number and valid according to an anonymous predicate"
			)
			attest(Unnamed(11.5).toString()).snap(
				"must be valid according to an anonymous predicate (was 11.5)"
			)
		})

		it("binds the classes it receives in the order arktype sorts their names in", async () => {
			class Bird {}
			class Cat {}
			standIn(Bird, "a", "Bird")
			standIn(Cat, "b", "Cat")
			const { T: create } = await load({
				T: {
					type: type.instanceOf(Cat).or(type.instanceOf(Bird)),
					params: [
						{ kind: "class", label: "`Cat`", value: Cat },
						{ kind: "class", label: "`Bird`", value: Bird }
					]
				}
			})
			class Ant {}
			class Zebra {}
			attest(create(Zebra, Ant).expression).snap("Ant | Zebra")
		})

		it("prints a union holding another once their branches print alike", async () => {
			class Bird {}
			class Cat {}
			class Dog {}
			standIn(Bird, "a", "Bird")
			standIn(Cat, "b", "Cat")
			standIn(Dog, "c", "Dog")
			const { T: create } = await load({
				T: {
					type: type({ a: type.instanceOf(Cat).or(type.instanceOf(Dog)) }).or(
						type({ a: type.instanceOf(Bird) })
					),
					params: [
						{ kind: "class", label: "`Cat`", value: Cat },
						{ kind: "class", label: "`Dog`", value: Dog },
						{ kind: "class", label: "`Bird`", value: Bird }
					]
				}
			})
			// a build minifying its chunks apart can name all three alike
			const alike = () => class r {}
			const T = create(alike(), alike(), alike())
			attest(T.expression).snap("{ a: r }")
			attest(T.description).snap("{ a: an instance of r }")
		})

		it("prints a union whose branches print alike before their functions are received", async () => {
			class User {
				role: string
				constructor(role: string) {
					this.role = role
				}
			}
			standIn(User, "a", "User")
			const isAdmin = standIn((u: User) => u.role === "admin", "b", "isAdmin")
			const isOwner = standIn((u: User) => u.role === "owner", "c", "isOwner")
			const { T: create } = await load({
				T: {
					type: type
						.instanceOf(User)
						.narrow(isAdmin)
						.or(type.instanceOf(User).narrow(isOwner)),
					params: [
						{ kind: "class", label: "`User`", value: User },
						{ kind: "function", label: "`isAdmin`", value: isAdmin },
						{ kind: "function", label: "`isOwner`", value: isOwner }
					]
				}
			})
			class Member {
				role: string
				constructor(role: string) {
					this.role = role
				}
			}
			const admin = (u: Member) => u.role === "admin"
			const owner = (u: Member) => u.role === "owner"
			const T = create(Member, admin, owner)
			attest(T.expression).snap("Member")
			attest(T(new Member("guest")).toString()).snap(
				"must be valid according to admin or valid according to owner (was Member)"
			)
		})

		it("prints a discriminant's cases with the names of the functions it receives", async () => {
			const now = standIn(() => 1, "a", "now")
			const later = standIn(() => 2, "b", "later")
			const { T: create } = await load({
				T: {
					type: type({ at: type.unit(now) }).or(type({ at: type.unit(later) })),
					params: [
						{ kind: "function", label: "`now`", value: now },
						{ kind: "function", label: "`later`", value: later }
					]
				}
			})
			const soon = () => 1
			const then = () => 2
			attest(create(soon, then)({ at: 1 }).toString()).snap(
				"at must be Function(soon) or Function(then) (was 1)"
			)
			const alike = () => ({ r: () => 1 }).r
			attest(create(alike(), alike())({ at: 1 }).toString()).snap(
				"at must be Function(r) (was 1)"
			)
		})

		it("rejects an order between siblings differing beyond the functions they hold", () => {
			const isEven = standIn((n: number) => n % 2 === 0, "a", "isEven")
			const isSmall = standIn((n: number) => n < 10, "b", "isSmall")
			const isPositive = standIn((n: number) => n > 0, "c", "isPositive")
			attest(() =>
				precompileStandalone({
					T: {
						type: type("number")
							.narrow(isSmall)
							.or(type("number").narrow(isEven).narrow(isPositive)),
						params: [
							{ kind: "function", label: "`isSmall`", value: isSmall },
							{ kind: "function", label: "`isEven`", value: isEven },
							{ kind: "function", label: "`isPositive`", value: isPositive }
						]
					}
				})
			).throws(
				writeUnprecompilableMessage(
					"an order that depends on the name of `isEven`"
				)
			)
		})

		it("rejects an order between siblings whose functions' parameter counts compile apart", () => {
			const isSmall = standIn((n: number) => n < 10, "a", "isSmall")
			const isEven = standIn(
				(n: number, ctx: { mustBe: (s: string) => false }) =>
					n % 2 === 0 || ctx.mustBe("even"),
				"b",
				"isEven"
			)
			attest(() =>
				precompileStandalone({
					T: {
						type: type("number")
							.narrow(isSmall)
							.or(type("number").narrow(isEven)),
						params: [
							{ kind: "function", label: "`isSmall`", value: isSmall },
							{ kind: "function", label: "`isEven`", value: isEven }
						]
					}
				})
			).throws(
				writeUnprecompilableMessage(
					"an order that depends on the name of `isEven`"
				)
			)
		})

		it("creates props in key order whatever their functions are named", async () => {
			const now = standIn(() => 1, "a", "now")
			const later = standIn(() => 2, "b", "later")
			const { T: create } = await load({
				T: {
					type: type({
						start: ["number", "=", now],
						end: ["number", "=", later]
					}),
					params: [
						{ kind: "function", label: "`now`", value: now },
						{ kind: "function", label: "`later`", value: later }
					]
				}
			})
			// names a minifier gave them, which sort the other way
			const Ot = () => 1
			const jt = () => 2
			attest(JSON.stringify(create(Ot, jt)({}))).equals('{"end":2,"start":1}')
		})

		it("binds siblings whose functions' declared names are equal", async () => {
			const isSmall = standIn((n: number) => n < 10, "a", "fn")
			const isEven = standIn((n: number) => n % 2 === 0, "b", "fn")
			const { T: create } = await load({
				T: {
					type: type("number")
						.narrow(isSmall)
						.or(type("number").narrow(isEven)),
					params: [
						{ kind: "function", label: "`isSmall`", value: isSmall },
						{ kind: "function", label: "`isEven`", value: isEven }
					]
				}
			})
			const small = (n: number) => n < 10
			const even = (n: number) => n % 2 === 0
			attest(create(small, even).description).snap(
				"a number and valid according to even or a number and valid according to small"
			)
		})

		it("rejects an order between a function it receives and a keyword's", () => {
			const isLong = standIn((s: string) => s.length > 10, "a", "isLong")
			attest(() =>
				precompileStandalone({
					T: {
						type: type
							.schema({
								domain: "string",
								predicate: { predicate: isLong, meta: "long" }
							})
							.or("string.date"),
						params: [{ kind: "function", label: "`isLong`", value: isLong }]
					}
				})
			).throws(
				writeUnprecompilableMessage(
					"an order that depends on the name of `isLong`"
				)
			)
		})

		it("rejects an order that depends on the name of a hole it can't name", () => {
			const isEven = standIn((n: number) => n % 2 === 0, "iseven")
			const isPositive = standIn((n: number) => n > 0, "ispositive")
			attest(() =>
				precompileStandalone({
					T: {
						type: type("number")
							.narrow(isEven)
							.or(type("number").narrow(isPositive)),
						params: [
							{ kind: "function", label: "`isEven`", value: isEven },
							{ kind: "function", label: "`isPositive`", value: isPositive }
						]
					}
				})
			).throws.snap(
				"ParseError: an order that depends on the name of `isEven` can't be precompiled to a standalone validator"
			)
		})

		it("completes only the names of the functions it receives", () => {
			// a function named otherwise is printed by name in words like "and", where the factory can't find it
			const and = (n: number) => n > 0
			attest(() =>
				precompileStandalone({
					T: {
						type: type("number").narrow(and),
						params: [{ kind: "function", label: "`and`", value: and }]
					}
				})
			).throws("Unexpected function `and` not named by a placeholder")
			attest(() =>
				precompileStandalone({ T: type("string").describe("$hole_other") })
			).throws(
				writeUnprecompilableMessage(
					"the name of $hole_other, which the validator doesn't receive"
				)
			)
		})
	})

	it("checks the runtime's version before reading its exports", async () => {
		const mismatched = precompileStandalone({ T: type("string") })
			.code.replace(
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
		const { js } = bundle(precompileStandalone({ T: type("boolean") }).code)
		const error = await import(urlOf(js)).catch((e: Error) => e)
		attest(error.message).equals(
			writeEntryConflictMessage("arktype/runtime", "arktype")
		)
	})

	it("keeps arktype from loading beside it", () => {
		const { js } = bundle(precompileStandalone({ T: type("string") }).code)
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

	it("loads beside arktype once a runtime island allows it", () => {
		const entries = globalThis as Record<string, unknown>
		const entry = entries[entryKey]
		try {
			delete entries[entryKey]
			claimEntry("arktype/runtime")
			allowIslands()
			claimEntry("arktype")
			claimEntry("arktype/runtime")
			entries[entryKey] = "arktype"
			allowIslands()
			attest(() => claimEntry("arktype/runtime")).throws(
				writeEntryConflictMessage("arktype/runtime", "arktype")
			)
		} finally {
			entries[entryKey] = entry
		}
	})

	it("shares the program's configuration with runtime islands", async () => {
		const sharedBy = async (program: string): Promise<unknown[]> =>
			(
				await importBesideArktype(
					bundle(`import { configure, shareConfig } from "@ark/schema/runtime"
const shared = []
${program}
export default shared`).js
				)
			).default
		const configure = "configure({ onFail: null })"
		const share = "shareConfig(config => shared.push(config))"
		attest(await sharedBy(`${configure}\n${share}`)).equals([{ onFail: null }])
		attest(await sharedBy(`${share}\n${configure}`)).equals([{ onFail: null }])
		attest(await sharedBy(share)).equals([])
	})

	it("bundles without node, scope, parse or code-generating code", () => {
		const { js, modules } = bundle(
			precompileStandalone({
				T: type({ a: "string.numeric.parse", b: "(number | Date)[]" }).or(
					"string.json.parse"
				)
			}).code
		)
		const runtimeModules = new Set([
			"<stdin>",
			"schema/runtime.ts",
			"schema/shared/errorWriters.ts",
			"schema/shared/errors.ts",
			"schema/shared/jsonSchema.ts",
			"schema/shared/locale.ts",
			"schema/shared/registry.ts",
			"schema/shared/render.ts",
			"schema/shared/transform.ts",
			"schema/shared/traversal.ts",
			"schema/shared/utils.ts",
			"schema/structure/shared.ts",
			"type/entry.ts",
			"type/fn.ts",
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
