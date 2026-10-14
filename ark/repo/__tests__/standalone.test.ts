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
	writeCreatedBeforeConfigureMessage,
	writtenConfigMessage
} from "@ark/schema/runtime"
import { arkKindOf, flatMorph } from "@ark/util"
import { ark, generic, match, scope, type, type Scope } from "arktype"
import { de } from "arktype/locales/de"
import {
	precompileStandalone,
	writeUnprecompilableMessage,
	type FactoryParam,
	type StandaloneExport,
	type StandaloneFactory,
	type StandaloneOptions,
	type ValidatorMembers
} from "arktype/internal/standalone.ts"
import {
	bakedJsonSchemaOptionsMessage,
	type as runtimeType,
	writeCreationMismatchMessage,
	writeIdentityMismatchMessage,
	writeUnbakedMessage,
	type HoleKind
} from "arktype/runtime"
import { keptIssuesOf } from "@ark/precompile/internal/issues.ts"
import { buildSync } from "esbuild"

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

const importCode = (js: string): Promise<any> => import(urlOf(js))

// what most tests compare a validator's strings by
const printed: ValidatorMembers = { expression: true, description: true }

// the program's configure call runs before the artifact, as its config module does, and each validator is read as a site reads it
const load = async (
	exports: Record<string, StandaloneExport>,
	configure = "",
	fingerprint?: string,
	members = printed,
	opts?: StandaloneOptions
): Promise<Record<string, any>> => {
	const { code, folds } = precompileStandalone(exports, {
		...opts,
		configured:
			opts?.configured ??
			(fingerprint === undefined ? undefined : (
				{ fingerprint, path: "main.ts" }
			)),
		members
	})
	const artifact = await importCode(
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

// the unit a JSON Schema can't hold, like a Date, which its error's context holds
const thrownUnitOf = (read: () => unknown): any => {
	try {
		read()
	} catch (e) {
		return ((e as ToJsonSchema.Error).context as ToJsonSchema.UnitContext).unit
	}
}

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
	members?: ValidatorMembers
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
			members
		)
	).T

// a validator's errors are compared with arktype's by what they keep, as their text is written from less
const observe = (result: unknown, input: unknown) =>
	hasArkKind(result, "errors") ?
		{ issues: keptIssuesOf(result) }
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

	it("declares an array's indices through the greatest, as arktype does", async () => {
		const types = {
			rejected: type("string[]").onUndeclaredKey("reject"),
			deleted: type("string[]").onUndeclaredKey("delete")
		}
		const validators = await load(types)
		// an array holding index 4294967294 is 4294967295 long, too long to check, so a Proxy lists the key on a short one
		const listing = (key: string) =>
			new Proxy(["a"], {
				ownKeys: target => [...Reflect.ownKeys(target), key],
				getOwnPropertyDescriptor: (target, k) =>
					k === key ?
						{ value: "b", enumerable: true, configurable: true }
					:	Reflect.getOwnPropertyDescriptor(target, k)
			})
		const [greatest, past, named] = [
			listing("4294967294"),
			listing("4294967295"),
			Object.assign(["a"], { 4294967295: "b" })
		]
		for (const [name, t] of Object.entries(types)) {
			for (const input of [greatest, past, named]) {
				attest(observe(validators[name](input), input)).equals(
					observe(t(input), input)
				)
				attest(validators[name].allows(input)).equals(t.allows(input))
			}
		}
		attest(validators.rejected.allows(greatest)).equals(true)
		attest(validators.rejected.allows(past)).equals(false)
		attest(Object.keys(validators.deleted(greatest))).equals([
			"0",
			"4294967294"
		])
		attest(validators.deleted(named)).equals(["a"])
	})

	it("builds each issue from its check's code, path and data and what its node describes", async () => {
		const { T } = await load({
			T: type({ a: "string", b: { c: "number > 0" } })
		})
		const errors = T({ b: { c: 0 } })
		attest(errors.issues).snap([
			{
				code: "required",
				path: ["a"],
				data: { b: { c: 0 } },
				expected: undefined,
				message: "a is missing"
			},
			{
				code: "min",
				path: ["b", "c"],
				data: 0,
				expected: "positive",
				message: "b.c must be positive"
			}
		])
		attest(errors.toJSON()).is(errors.issues)
	})

	it("keeps apart the issues at one path, which arktype groups", async () => {
		const T = type({ "[/^a/]": "string[] >= 2", "[/a$/]": "unknown[] <= 0" })
		const { T: validator } = await load({ T })
		attest(validator({ a: ["q"] }).summary).snap(`a must be at least length 2
a must be exactly length 0`)
	})

	it("reports the issues it writes into the arktype traversal a morph passes it", async () => {
		const { T } = await load({
			T: type({ a: "string", flag: "boolean", n: "string | null" })
		})
		const out = type("unknown").pipe((data, ctx) => T(data, ctx))({
			flag: 5,
			n: 5
		})
		attest(out instanceof type.errors).equals(true)
		attest(String(out)).snap(`a is missing
flag must be boolean
n must be a string or null`)
	})

	it("adds its issues to the traversal of a validator whose morph passes it ctx", async () => {
		let Inner: (data: unknown, ctx: Traversal) => unknown = () => {}
		const wrap = standIn(
			(o: { a: unknown }, ctx: Traversal) => ({ inner: Inner(o.a, ctx) }),
			"wrap"
		)
		const next = standIn(() => "x", "next")
		const isLong = standIn(
			(s: string, ctx: Traversal) => s.length > 1 || ctx.mustBe("long"),
			"islong"
		)
		// written by the runtime's createValidator, then by a creator the build writes
		for (const members of [{}, { methods: false }]) {
			const created = await load(
				{
					Inner: type({ n: "number" }),
					Wrapping: {
						type: type({ a: "unknown" }).pipe(wrap),
						params: [{ kind: "function", label: "`wrap`", value: wrap }]
					},
					Defaulted: {
						type: type({ a: [type("string").narrow(isLong), "=", next] }),
						params: [
							{ kind: "function", label: "`isLong`", value: isLong },
							{ kind: "function", label: "`next`", value: next }
						]
					}
				},
				undefined,
				undefined,
				members
			)
			Inner = created.Inner
			attest(String(created.Wrapping(wrap)({ a: { n: "x" } }))).equals(
				"n must be a number"
			)
			attest(String(created.Defaulted(isLong, next)({}))).equals(
				"a must be long"
			)
		}
	})

	it("lacks each member its build sets false", async () => {
		const T = type({ name: "string" })
		const membersOf = (validator: object) => ({
			assert: "assert" in validator,
			meta: "meta" in validator,
			"~standard": "~standard" in validator,
			methods:
				"traverse" in validator &&
				"from" in validator &&
				Object.getPrototypeOf(validator) !== Function.prototype
		})
		const all = { assert: true, meta: true, "~standard": true, methods: true }
		const { T: full } = await load({ T })
		attest(membersOf(full)).equals(all)
		for (const member of Object.keys(all)) {
			const { T: validator } = await load({ T }, undefined, undefined, {
				[member]: false
			})
			attest(membersOf(validator)).equals({ ...all, [member]: false })
			attest(validator({ name: "a" })).equals({ name: "a" })
			attest(validator({}).summary).equals(full({}).summary)
		}
	})

	it("lacks every member its build sets false", async () => {
		const T = type({ name: "string", "tags?": "string[]" })
		const { T: validator } = await load({ T }, undefined, undefined, {
			assert: false,
			meta: false,
			"~standard": false,
			methods: false,
			expression: true
		})
		attest(Object.keys(validator)).equals(["expression", "allows"])
		attest(Object.getPrototypeOf(validator)).is(Function.prototype)
		attest(Object.isFrozen(validator)).equals(true)
		attest(validator({ name: "a" })).equals({ name: "a" })
		attest(validator.allows({ name: "a", tags: [1] })).equals(false)
		attest(validator({ tags: [1] }).summary).snap(`name is missing
tags[0] must be a string`)
	})

	it("adds its issues to a Type piping into it rather than run its configured onFail, without methods too", async () => {
		const config: ArkSchemaConfig = { onFail: errors => errors.throw() }
		for (const members of [{}, { methods: false }]) {
			const { T } = await load(
				{ T: type({ a: "string" }) },
				`runtime.configure({ onFail: errors => errors.throw() }, "${fingerprintOf(config)}")`,
				fingerprintOf(config),
				members
			)
			const Piping = type("unknown").pipe((data, ctx) => T(data, ctx))
			attest(String(Piping({ a: 1 }))).equals("a must be a string")
		}
	})

	it("fails as its meta's onFail does without its meta", async () => {
		const measure = standIn((s: string) => s.length, "measure")
		const flip = standIn((n: number) => -n, "flip")
		const create = await loadFactory(
			match({ string: measure, number: flip, default: "assert" }) as never,
			[
				["function", "`measure`", measure],
				["function", "`flip`", flip]
			],
			{ meta: false }
		)
		const matcher = create(
			(s: string) => s.length,
			(n: number) => -n
		)
		attest("meta" in matcher).equals(false)
		attest([matcher("abc"), matcher(2)]).equals([3, -2])
		attest(() => matcher(true)).throws.snap(
			"TraversalError: must be a string or a number"
		)
	})

	it("keeps every member of what the runtime reads off a validator", async () => {
		const Defaulted = type({ n: ["string.numeric.parse", "=", "1"] })
		const { Defaulted: defaulted } = await load(
			{ Defaulted },
			undefined,
			undefined,
			{ methods: false }
		)
		attest(defaulted({})).equals(Defaulted({}))
		const measure = standIn((s: string) => s.length, "measured")
		const create = await loadFactory(
			type.fn("string", ":", "number")(measure) as never,
			[["function", "`measure`", measure]],
			{ assert: false }
		)
		const count = create((s: string) => s.length)
		attest(count("abc")).equals(3)
		attest(() => count(1)).throws.snap("TraversalError: [0] must be a string")
	})

	it("adds its issues after those its traversal holds at the same path", async () => {
		let Str: (data: unknown, ctx: Traversal) => unknown = () => {}
		let Num: (data: unknown, ctx: Traversal) => unknown = () => {}
		const both = standIn(
			(data: unknown, ctx: Traversal) => [Str(data, ctx), Num(data, ctx)],
			"both"
		)
		const created = await load({
			Str: type("string"),
			Num: type("number"),
			Both: {
				type: type({ a: type("unknown").pipe(both) }),
				params: [{ kind: "function", label: "`both`", value: both }]
			}
		})
		Str = created.Str
		Num = created.Num
		attest(String(created.Both(both)({ a: true }))).snap(`a must be a string
a must be a number`)
	})

	it("writes an issue it adds again at its path, though a callback read it", async () => {
		let Inner: (data: unknown, ctx: Traversal) => unknown = () => {}
		const readsErrors = standIn(
			(_: unknown, ctx: Traversal) => String(ctx.errors) !== "",
			"readserrors"
		)
		const wrap = standIn(
			(data: unknown, ctx: Traversal) => Inner(data, ctx),
			"wrap"
		)
		const created = await load({
			Inner: {
				type: type({ a: "string", b: type("unknown").narrow(readsErrors) }),
				params: [
					{ kind: "function", label: "`readsErrors`", value: readsErrors }
				]
			},
			Wrapping: {
				type: type({ x: type("unknown").pipe(wrap) }),
				params: [{ kind: "function", label: "`wrap`", value: wrap }]
			}
		})
		Inner = created.Inner(readsErrors)
		attest(String(created.Wrapping(wrap)({ x: { a: 1, b: 0 } }))).snap(
			"x.a must be a string"
		)
	})

	it("adds its errors to a runtime island's Type piping to it under a throwing onFail", async () => {
		const config: ArkSchemaConfig = { onFail: errors => errors.throw() }
		const fingerprint = fingerprintOf(config)
		// written by createValidatorWith, then by creators the build writes, with and without the traverse a Type reads
		for (const [members, length] of [
			[{}, 1],
			[{ assert: false }, 1],
			[{ methods: false }, 2]
		] as const) {
			const { code } = precompileStandalone(
				{ T: type("string"), Parsed: type("string.numeric.parse") },
				{ configured: { fingerprint, path: "main.ts" }, members }
			)
			const { js } = bundle(`${code.replace(
				runtimeImport,
				`${runtimeImport}\nruntime.configure({ onFail: errors => errors.throw() }, "${fingerprint}")`
			)}
import "arktype/internal/island.js"
import { type } from "arktype"
export const piping = validator => type("unknown").pipe(validator)`)
			const artifact = await importCode(js)
			const T = artifact.T()
			const Parsed = artifact.Parsed()
			// a call passing only data pads no parameters
			attest([T.length, Parsed.length]).equals([length, length])
			attest(String(artifact.piping(T).traverse(1))).equals("must be a string")
			attest(String(artifact.piping(Parsed).traverse("x"))).equals(
				"must be a well-formed numeric string"
			)
		}
	})

	it("takes writes where its build doesn't freeze it", async () => {
		const T = type({ name: "string" })
		const { T: frozen } = await load({ T })
		const { T: validator } = await load(
			{ T },
			undefined,
			undefined,
			{
				toJSON: true
			},
			{ freeze: false }
		)
		const writable = (o: object) => !Object.isFrozen(o)
		attest(
			[frozen, frozen.assert, frozen.allows, frozen["~standard"]].map(writable)
		).equals([false, false, false, false])
		attest(
			[
				validator,
				validator.assert,
				validator.allows,
				validator.toJSON,
				validator["~standard"],
				validator["~standard"].validate
			].map(writable)
		).equals([true, true, true, true, true, true])
		validator.label = "user"
		attest(validator.label).equals("user")
		attest(validator({ name: 1 }).summary).equals(frozen({ name: 1 }).summary)
	})

	it("bakes introspection", async () => {
		const T = type({ name: "string", age: "number" }).describe("a person")
		const { T: validator } = await load({ T })
		attest(validator.expression).equals(T.expression)
		attest(validator.description).equals("a person")
		attest(validator.meta).equals({ description: "a person" })
		attest(String(validator)).equals("Type<{ age: number, name: string }>")
		attest(validator.from({ name: "n", age: 1 })).equals({ name: "n", age: 1 })
		attest(() => validator.assert({})).throws
			.snap(`TraversalError: age is missing
name is missing`)
		attest(validator["~standard"].validate({ name: "n", age: 1 })).equals({
			value: { name: "n", age: 1 }
		})
		attest("jsonSchema" in validator["~standard"]).equals(false)
	})

	it("bakes none of a keyword's meta, but a Type's the program configures", async () => {
		const { Id, Described } = await load({
			Id: type("string.uuid"),
			Described: type("string.uuid").describe("an id")
		})
		attest(Id.meta).equals({})
		attest(Described.meta).equals({ description: "an id", format: "uuid" })
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
			const T = (await importCode(js)).T()
			attest(T({ a: 1 }).summary).snap("a must be a string")
		} finally {
			globalThis.Function = Function
		}
		attest(bodies).equals([])
	})

	it("returns only each validation's first issue where its build asks", async () => {
		const isLong = (s: string) => s.length > 3
		const built = standIn(isLong.bind(null), "long")
		const exports = {
			T: type({ a: "string", b: "number", c: ["string", "[]"] }),
			Narrowed: {
				type: type({ a: "string", b: type("string").narrow(built) }),
				params: [{ kind: "function", label: "`isLong`", value: built }]
			}
		} satisfies Record<string, StandaloneExport>
		const artifact = await importCode(
			bundle(precompileStandalone(exports, { errors: "first" }).code).js
		)
		const T = artifact.T()
		const Narrowed = artifact.Narrowed(isLong)
		attest([
			T({ a: 1, b: "b", c: [1] }).summary,
			Narrowed({ a: 1, b: "b" }).summary,
			Narrowed({ a: "a", b: "b" }).summary
		]).snap([
			"a must be a string",
			"a must be a string",
			"b must be valid according to isLong"
		])
		attest(
			type(exports.T)({ a: 1, b: "b", c: [1] })
				.toString()
				.split("\n")
		).snap([
			"a must be a string (was a number)",
			"b must be a number (was a string)",
			"c[0] must be a string (was a number)"
		])
	})

	it("gives each Type its own traversal of a prop they share", () => {
		// a prop that morphs is applied by a traversal of its own, not in its structure's
		const declarations = precompileStandalone({
			A: type({ id: "string.trim", a: "string" }),
			B: type({ id: "string.trim", b: "string" })
		}).code.match(/^const required\w+Apply/gm)!
		attest(declarations.length).equals(2)
		attest(new Set(declarations).size).equals(1)
	})

	it("checks a structure and its props in their parent's traversal, but for what transforms", () => {
		const { code } = precompileStandalone({
			T: type({ a: "string", "b?": "number", c: "string.trim" })
		})
		const declared = [
			...code.matchAll(
				/^const (required|optional|structure)\w*?(Allows|Apply|Transform) /gm
			)
		].map(([, kind, traversal]) => kind + traversal)
		attest(declared).equals(["requiredApply", "structureTransform"])
	})

	it("loads without a global one of its validators reads", async () => {
		const Global = class {}
		Object.assign(globalThis, { Global })
		const { js } = bundle(
			precompileStandalone({ S: type("string"), G: type.instanceOf(Global) })
				.code
		)
		delete (globalThis as { Global?: unknown }).Global
		const S = (await importCode(js)).S()
		attest(S("s")).equals("s")
	})

	it("bakes the introspection its build lists", async () => {
		const T = type({ name: "string", "tags?": "string[]" })
		const { T: validator } = await load({ T }, undefined, undefined, {
			json: true,
			toJSON: true,
			toJsonSchema: true,
			"~standard.jsonSchema": true
		})
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
		const { T: validator } = await load({ T }, undefined, undefined, {
			toJsonSchema: true
		})
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
			{ toJsonSchema: true }
		)
		attest(Object.keys(T.toJsonSchema())).equals(
			Object.keys(type({ a: "string" }).toJsonSchema())
		)
		attest([T.json, T.description, T.expression, T.toJSON]).equals([
			undefined,
			undefined,
			undefined,
			undefined
		])
		attest(JSON.stringify({ T })).equals("{}")
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
		const create = await loadFactory(T, [["function", "length", length]], {
			json: true,
			toJsonSchema: true
		})
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
			await loadFactory(Long, [["function", "long", isLong]], {
				toJsonSchema: true
			})
		)(isLong)
		const Types = {
			After: type("Date > d'2020-01-01'"),
			Epoch: type.unit(new Date(0)),
			Big: type("1n"),
			Instance: type("instanceof", Map)
		}
		const validators = await load(Types, undefined, undefined, {
			toJsonSchema: true
		})
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
			{ json: true }
		)
		attest(() => {
			A.json.required[0].key = "b"
		}).throws.snap(
			"TypeError: Cannot assign to read only property 'key' of object '#<Object>'"
		)
		attest(B.json).equals(type({ a: "string" }).json)
	})

	it("keeps apart the Dates and RegExps of Types arktype keeps apart, which a program can write", async () => {
		const { A, B, U } = await load(
			{
				A: type("string").configure({
					examples: [/a/g, new Date(0)] as never
				}),
				B: type("string").configure({
					examples: [/a/g, new Date(0)] as never
				}),
				U: type("d'1970-01-01'")
			},
			undefined,
			undefined,
			{ toJsonSchema: true }
		)
		const [regex, date] = A.meta.examples
		const [otherRegex, otherDate] = B.meta.examples
		regex.exec("aaa")
		Date.prototype.setTime.call(date, 1)
		attest([
			otherRegex.lastIndex,
			otherDate.getTime(),
			thrownUnitOf(() => U.toJsonSchema()).getTime()
		]).equals([0, 0, 0])
		// held as arktype holds them
		attest([Object.isFrozen(date), Object.getOwnPropertyNames(date)]).equals([
			false,
			[]
		])
	})

	it("keeps the lastIndex of a RegExp a program can read", async () => {
		const held = /a/g
		held.lastIndex = 2
		const { T } = await load({
			T: type("string").configure({ examples: [held] as never })
		})
		attest(T.meta.examples[0].lastIndex).equals(2)
	})

	it("throws where it's read a JSON Schema that calls a default's thunk", async () => {
		const empty = standIn(() => [], "empty")
		const T = type({ tags: ["string[]", "=", empty] })
		const validator = (
			await loadFactory(T, [["function", "empty", empty]], {
				json: true,
				toJsonSchema: true,
				"~standard.jsonSchema": true
			})
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
		const { T: validator } = await load({ T }, undefined, undefined, {
			toJsonSchema: true
		})
		attest(() => T.toJsonSchema()).throws("no schema")
		attest(() => validator.toJsonSchema()).throws(
			writeUnbakedMessage(
				`${writeUnprecompilableMessage("a JSON Schema whose writing throws")}: Error: no schema`
			)
		)
		const early = new Date(0)
		attest(observe(validator(early), early)).equals(observe(T(early), early))
	})

	it("throws arktype's ParseError where the view of a Type its JSON Schema writes can't be created", async () => {
		// the output requires the defaulted element, which the index signature's value excludes
		const T = type({ a: ["string = 'a'"], "[string]": "number[]" })
		const { T: validator } = await load({ T }, undefined, undefined, {
			"~standard.jsonSchema": true
		})
		const thrown = (t: typeof T) => {
			try {
				t["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			} catch (e) {
				return [(e as Error).constructor.name, (e as Error).message]
			}
		}
		attest(thrown(T)).snap([
			"ParseError",
			"Intersection at a[0] of string and number results in an unsatisfiable type"
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
		attest(["and", "in"].filter(k => k in T)).equals([])
		attest(() => (runtimeType as any)("string")).throws.snap(
			"TypeError: runtimeType is not a function"
		)
		attest(Reflect.ownKeys(runtimeType)).equals(["errors"])
	})

	it("refuses a writer or text its meta configures for its errors, other than an expected string", async () => {
		const write = standIn(() => "written", "write")
		const T: StandaloneExport = {
			type: type("number").configure({ message: write }),
			params: [{ kind: "function", label: "`write`", value: write }]
		}
		attest(() => precompileStandalone({ T })).throws(
			writeUnprecompilableMessage("`number`'s configured message")
		)
		attest(() =>
			precompileStandalone({ T: type("number").configure({ problem: "p" }) })
		).throws(writeUnprecompilableMessage("`number`'s configured problem"))
		const expect = standIn(() => "even", "expect")
		attest(() =>
			precompileStandalone({
				T: {
					type: type("number").configure({ expected: expect }),
					params: [{ kind: "function", label: "`expect`", value: expect }]
				}
			})
		).throws(writeUnprecompilableMessage("`number`'s configured expected"))
		const { Even } = await load({
			Even: type("number").configure({ expected: "an even number" })
		})
		attest(Even("x").summary).snap("must be an even number")
	})

	it("writes a callback's error from the text it supplies, without its meta's writers", async () => {
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
		attest(create(isLarge)(1.5).summary).snap("must be more than 3")
	})

	it("refuses error text a scope configures, strings among them", () => {
		const $ = scope(
			{ T: { a: "string" } },
			{ domain: { message: "configured" } }
		)
		attest(() => precompileStandalone({ T: $.export().T })).throws(
			writeUnprecompilableMessage("a configured domain message")
		)
		attest(() =>
			precompileStandalone({
				S: scope({}, { unit: { expected: "an a" } }).type("'a'")
			})
		).throws(writeUnprecompilableMessage("a configured unit expected"))
	})

	it("validates with the configuration its program applies", async () => {
		const config: ArkSchemaConfig = {
			onFail: errors => errors.issues.map(issue => issue.code)
		}
		const { T } = scope(
			{ T: { a: "string", b: "number % 2" } },
			config
		).export()
		const { T: validator } = await load(
			{ T: type({ a: "string", b: "number % 2" }) },
			`runtime.configure({
	onFail: errors => errors.issues.map(issue => issue.code)
}, "${fingerprintOf(config)}")`,
			fingerprintOf(config)
		)
		const input = { a: 1, b: 3 }
		attest(validator(input)).equals(T(input))
		attest(validator(input)).snap(["domain", "divisor"])
	})

	it("neither checks nor reads the configuration where its build says the program never configures it", async () => {
		const { T } = await load(
			{ T: type("string") },
			`runtime.configure({ onFail: errors => errors.issues.map(issue => issue.code) })`,
			undefined,
			printed,
			{ configured: false }
		)
		attest(T(1).summary).equals("must be a string")
		attest(await messageOf("runtime.configure({})")).equals(
			configMismatchMessage
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
		attest(await messageOf("runtime.configure({})")).equals(
			configMismatchMessage
		)
		const createdFirst = precompileStandalone({
			T: type("string")
		}).code.replace(
			"runtime.fixConfig()",
			"runtime.fixConfig()\nruntime.configure({})"
		)
		attest(
			await importCode(bundle(createdFirst).js)
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
		const artifact = await importCode(
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
		const config = { onFail: () => "configured" }
		const artifact = await importCode(
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
		attest(artifact.T()({ a: 1 })).equals("configured")
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
			const artifact = await importCode(
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
		for (const [name, t] of Object.entries(types)) {
			attest(observe(validators[name](input), input)).equals(
				observe(t(input), input)
			)
		}
		attest(validators.ownFirst(input).summary).snap("a.v must be a number")
		attest(validators.keptAfter(input).summary).snap(
			"a.v must be a custom number"
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
		attest(observe(validators.M.b({ a: 1 }), undefined)).equals(
			observe(M.b({ a: 1 }), undefined)
		)
		attest(validators.M.sub.c("x").summary).snap("must be a number")
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
		attest(union.meta.schema === n).equals(true)
	})

	it("freezes what a program reads from it", async () => {
		const T = type({ a: "string" }).configure({
			examples: [{ a: "x" }],
			pattern: /x/g
		} as never)
		const M = scope({ a: "string" }).export()
		const Box = type("<t>", { box: "t" })
		let config: any
		const read = standIn((_: unknown, ctx: Traversal) => {
			config = ctx.config
			return true
		}, "read")
		const artifact = await load({
			T,
			M,
			$: scope({}),
			Box,
			Read: {
				type: type("string").narrow(read),
				params: [{ kind: "function", label: "`read`", value: read }]
			}
		})
		artifact.Read(read)("a")
		const { T: validator, M: module } = artifact
		const prototype = Object.getPrototypeOf(validator)
		const writes = {
			property: () => (validator.x = 1),
			meta: () => (validator.meta.x = 1),
			example: () => (validator.meta.examples[0].a = "y"),
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
			config: () => (config.jitless = false)
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
		// shared by every validator, as arktype's by every Type
		attest(Object.isFrozen(prototype.from)).equals(false)
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
			const M = (await importCode(source)).M()
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
			map: refusalOf(new Map()),
			hole: refusalOf(new Array(1)),
			extra: refusalOf(Object.assign([1], { x: 1 })),
			hidden: refusalOf(Object.defineProperty({}, "x", { value: 1 })),
			symbol: refusalOf({ [Symbol("x")]: 1 }),
			date: refusalOf(Object.assign(new Date(0), { x: 1 })),
			regex: refusalOf(Object.assign(/x/, { x: 1 }))
		}).equals({
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
		]).equals([5, "must be a string", true])
	})

	it("precompiles a Type under a configured intersection writer, as its issues at a path are kept apart", async () => {
		const T = scope({}, { intersection: { message: () => "configured" } }).type(
			"string >= 5 & /^a/"
		)
		const { T: validator } = await load({ T })
		attest(validator("b").summary).snap(`must be matched by ^a
must be at least length 5`)
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
		attest(errors.toLocaleString(de)).equals(errors.summary)
	})

	it("writes errors only in en beside a runtime island", async () => {
		const { js } = bundle(`${precompileStandalone({ T: type("string") }).code}
import "arktype/internal/island.js"
import { type } from "arktype"
export { de } from "arktype/locales/de"
export const Island = type("string")`)
		const artifact = await importCode(js)
		const errors = artifact.T()(1)
		attest(errors.toLocaleString(artifact.de)).equals(errors.summary)
		attest(errors.summary).snap("must be a string")
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
		const artifact = await importCode(js)
		const errors = artifact.Island([1, artifact.T()])
		attest([
			errors.toLocaleString(artifact.de),
			artifact.messageIn(errors.issues[0], artifact.de)
		]).snap(["must be a string", "must be a string"])
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
				"must be valid according to isDivisibleBy2"
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
					"another Type<string>",
					"the Type it was at build"
				)
			)
			attest(() => create(validators.Described(trim))).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"another Type<(In: string) => Out<unknown>>",
					"the Type it was at build"
				)
			)
			// e.g. a mock of the module exporting it, described without printing it
			attest(() => create(undefined)).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"undefined",
					"the Type it was at build"
				)
			)
			attest(() => create({})).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"an object",
					"the Type it was at build"
				)
			)
			const unlisted = await load(
				{
					User: {
						type: User,
						params: [{ kind: "input", label: "Name", reads: [[[], Name]] }]
					},
					Text: type("string")
				},
				undefined,
				undefined,
				{}
			)
			attest(() => unlisted.User(unlisted.Text)).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"another Type",
					"the Type it was at build"
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

		it("writes once what a factory creates from a Type it receives", async () => {
			const isEven = standIn((n: number) => n % 2 === 0, "even")
			const $ = scope({ even: ["number", ":", isEven], s: "string" })
			const U = $.type({ name: "s" })
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
					.code.split("const factory")
					.slice(1)
					.map(factory => factory.includes("??= create"))
			).equals([false, true, true, true])
			const created = await load(exports)
			const holder = created.$(isEven)
			attest(
				created.Derived(created.U(holder))({ name: "x", a: 1 }).toString()
			).snap("a must be a string")
			attest(created.Exposing(created.Name)({ n: 5 }).summary).snap(
				"n must be a name"
			)
		})

		it("shares one function between folded factories alike but for where their creation holds their Type", async () => {
			const isEven = standIn((n: number) => n % 2 === 0, "even")
			// the Types share the pattern's RegExp, so one creation makes them all
			const $ = scope({ even: ["number", ":", isEven], s: "/^a/" })
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
			attest(created.B(holder)({ b: 3 }).toString()).snap("b must be a string")
			attest(created.C(holder)({ c: 3 }).toString()).snap("c must be a string")
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
					"another Type<Dog>",
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
				"ParseError: Default for a must be valid according to isEven"
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
				"TraversalError: must be a string or a number"
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
			attest(() => count(1)).throws.snap("TraversalError: [0] must be a string")
			attest(() => create((s: string) => s)("b")).throws.snap(
				"TraversalError: must be a number"
			)
			const unlisted = await loadFactory(
				type.fn("string", ":", "number")(length) as never,
				[["function", "`length`", length]],
				{}
			)
			attest(unlisted(count.raw).expression).equals(undefined)
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
				writeCreationMismatchMessage("`list`", "a function", expected)
			)
			const registry = Symbol.for("arktype.helpers")
			Reflect.set(globalThis, registry, {
				"helpers.ts": { __proto__: null, list }
			})
			try {
				attest(create(list)("a")).equals("a")
				attest(() => create((def: string) => def)).throws(
					writeCreationMismatchMessage("`list`", "a function", expected)
				)
			} finally {
				Reflect.deleteProperty(globalThis, registry)
			}
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

	it("shares the program's configuration with runtime islands", async () => {
		const sharedBy = async (program: string): Promise<unknown[]> =>
			(
				await importCode(
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
			"schema/shared/issues.ts",
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
