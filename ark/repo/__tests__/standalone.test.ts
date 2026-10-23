import { attest, contextualize } from "@ark/attest"
import { fromHere, readPackageJson } from "@ark/fs"
import {
	$ark,
	hasArkKind,
	type ArkSchemaConfig,
	type ExpectedContext,
	type MessageContext,
	type ProblemContext,
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
	precompileStandaloneModules,
	writeUnprecompilableMessage,
	type FactoryParam,
	type StandaloneExport,
	type StandaloneFactory,
	type StandaloneOptions,
	type ValidatorMembers
} from "arktype/internal/standalone.ts"
import {
	bakedJsonSchemaOptionsMessage,
	throwOnDefault as runtimeThrowOnDefault,
	type as runtimeType,
	writeCreationMismatchMessage,
	writeIdentityMismatchMessage,
	writeUnbakedMessage,
	type HoleKind
} from "arktype/runtime"
import { keptIssuesOf } from "@ark/aot/internal/issues.ts"
import { build, buildSync, type BuildOptions } from "esbuild"
import { join } from "node:path"
import { isDeepStrictEqual } from "node:util"

const optionsOf = (source: string) =>
	({
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
	}) satisfies BuildOptions

const bundle = (source: string) => {
	const result = buildSync(optionsOf(source))
	return {
		js: result.outputFiles[0].text,
		modules: Object.keys(result.metafile.inputs)
	}
}

const issuesPath = fromHere("..", "..", "schema", "shared", "issues.ts")

// as @ark/schema/runtime/none bundles it, issuesNone.ts for issues.ts
const bundleUndetailed = async (source: string): Promise<string> => {
	const { outputFiles } = await build({
		...optionsOf(source),
		plugins: [
			{
				name: "issuesNone",
				setup: pluginBuild =>
					pluginBuild.onResolve({ filter: /\/issues\.ts$/ }, args =>
						join(args.resolveDir, args.path) === issuesPath ?
							{ path: join(issuesPath, "..", "issuesNone.ts") }
						:	undefined
					)
			}
		]
	})
	return outputFiles[0].text
}

const urlOf = (js: string) =>
	`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`

const importCode = (js: string): Promise<any> => import(urlOf(js))

// what most tests compare a validator's strings by
const printed: ValidatorMembers = { expression: true, description: true }

interface LoadOptions extends StandaloneOptions {
	// run before the artifact, as a program's config module is
	configure?: string
	fingerprint?: string | undefined
}

// each validator is read as a site reads it
const load = async (
	exports: Record<string, StandaloneExport>,
	{ configure = "", fingerprint, members = printed, ...opts }: LoadOptions = {}
): Promise<Record<string, any>> => {
	const { code, folds } = precompileStandalone(exports, {
		...opts,
		configured:
			opts.configured ??
			(fingerprint === undefined ? undefined : (
				{ fingerprint, path: "main.ts" }
			)),
		members
	})
	const source = code.replace(runtimeImport, `${runtimeImport}\n${configure}`)
	const artifact = await importCode(
		opts.errors === "none" ? await bundleUndetailed(source) : bundle(source).js
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
	load({ T: type("string") }, { configure, fingerprint }).then(
		() => "",
		(e: Error) => e.message
	)

const runtimeImport = `import * as runtime from "arktype/runtime"`

// a hole's stand-in, named by the placeholder its factory completes
const standIn = <fn extends Function>(fn: fn, id: string, name = ""): fn =>
	Object.defineProperty(fn, "name", { value: `${name}$hole_${id}` })

const caught = (f: () => unknown): any => {
	try {
		f()
	} catch (e) {
		return e
	}
}

const jsonSchemaErrorOf = (t: { toJsonSchema: () => unknown }) => {
	const e: ToJsonSchema.Error = caught(() => t.toJsonSchema())
	return [
		Object.keys(e),
		e.name,
		e.code,
		e.context,
		e.hasCode(e.code),
		e instanceof Error
	]
}

// a factory, built with each hole's value as a build passes it
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
			{ members }
		)
	).T

// errors compare by what they keep, as their text is written from less
const observe = (result: unknown, input: unknown) =>
	hasArkKind(result, "errors") ?
		{ issues: keptIssuesOf(result) }
	:	{ out: result, isInput: result === input }

const agrees = (
	validators: Record<string, any>,
	types: Record<string, type.Any>,
	inputs: unknown[]
) => {
	for (const [name, t] of Object.entries(types)) {
		for (const input of inputs) {
			attest(observe(validators[name](input), input)).equals(
				observe(t(input), input)
			)
			attest(validators[name].allows(input)).equals(t.allows(input))
		}
	}
}

class Point {
	x = 1
	y = 2
}

contextualize(() => {
	it("validates as arktype, for speed or size", async () => {
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
		// for size, units are shared modules and validators share root applies
		const sized = async (members: ValidatorMembers) => {
			const { code, modules } = precompileStandaloneModules(types, {
				members,
				optimize: "size"
			})
			const { outputFiles } = await build({
				...optionsOf(code),
				plugins: [
					{
						name: "modules",
						setup: pluginBuild => {
							pluginBuild.onResolve({ filter: /^~arktype\// }, args => ({
								path: args.path,
								namespace: "modules"
							}))
							pluginBuild.onLoad(
								{ filter: /.*/, namespace: "modules" },
								args => ({
									contents: modules[args.path],
									resolveDir: fromHere(),
									loader: "js"
								})
							)
						}
					}
				]
			})
			const artifact = await importCode(outputFiles[0].text)
			return Object.fromEntries(
				Object.keys(types).map(name => [name, artifact[name]()])
			)
		}
		const builds = [
			await load(types),
			await sized(printed),
			await sized({ ...printed, assert: false })
		]
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
		for (const validators of builds) agrees(validators, types, inputs)
	})

	it("size keeps a literal holding a line separator", async () => {
		const { T } = await load(
			{ T: type({ k: "'x     y'" }) },
			{ optimize: "size" }
		)
		attest(T.allows({ k: "x     y" })).equals(true)
		attest(T.allows({ k: "x y" })).equals(false)
	})

	it("size reads a key holding a line separator", async () => {
		const key = "a\u2028    b"
		const { T } = await load(
			{ T: type({ [key]: "string", c: "number" }) },
			{ optimize: "size" }
		)
		attest(T.allows({ [key]: "x", c: 1 })).equals(true)
	})

	describe("literals reading as the code around them", () => {
		const builds: StandaloneOptions[] = [
			{},
			{ optimize: "size" },
			{ errors: "first" },
			{ errors: "none" },
			{ mutatesInput: true }
		]

		// each input fails with at most one issue, so a first-issue build keeps
		// arktype's, and an errors "none" build only fails where it does
		const agreesInEachBuild = async (
			types: Record<string, type.Any>,
			inputs: unknown[]
		) => {
			for (const opts of builds) {
				const validators = await load(types, opts)
				for (const [name, t] of Object.entries(types)) {
					for (const input of inputs) {
						const outcomeOf = (validator: (data: unknown) => unknown) => {
							const observed = observe(validator(input), input)
							return opts.errors === "none" ? "issues" in observed : observed
						}
						attest([
							opts,
							name,
							input,
							validators[name].allows(input),
							outcomeOf(validators[name])
						]).equals([opts, name, input, t.allows(input), outcomeOf(t)])
					}
				}
			}
		}

		it("reports into ctx however a key or unit reads", async () => {
			await agreesInEachBuild(
				{
					Keyed: type({
						"ctx.failsAt(": "string",
						"ctx.failsIn(": "string > 1"
					}),
					Units: type("'ctx.failsIn(' | 'ctx.failsAt(' | number")
				},
				[
					{ "ctx.failsAt(": "a", "ctx.failsIn(": "ab" },
					{ "runtime.failsAt(ctx, ": "a", "ctx.failsIn(": "ab" },
					{ "ctx.failsAt(": "a", "runtime.failsIn(ctx, ": "ab" },
					"ctx.failsIn(",
					"runtime.failsIn(ctx, ",
					0
				]
			)
		})

		it("unifies a Type whose literals read ctx", async () => {
			await agreesInEachBuild(
				{ Unit: type("'ctx.x'"), Keyed: type({ "ctx.": "'ctx.'" }) },
				["ctx.x", "ctx.y", { "ctx.": "ctx." }, { "ctx.": "ctx" }]
			)
		})

		it("applies a key that reads as the gate of the prop beside it", async () => {
			const Gated = type({ b: "string > 3" })
			// a leaf's Apply is named for its content, so a key can name it
			const apply = /failsIn\((\w+Apply), data\.b/.exec(
				precompileStandalone({ Gated }).code
			)![1]
			const key = `, xR1, data)!ctx.failsIn(${apply}, data.b, `
			await agreesInEachBuild({ T: Gated.and({ [`${key}?`]: "number" }) }, [
				{ b: "abcd", [key]: 0 },
				{ b: "abcd", [key]: "0" },
				{ b: "abc", [key]: 0 }
			])
		})

		it("switches on cases whose literals read as cases", async () => {
			await agreesInEachBuild(
				{
					Cases: type.enumerated('case "a": return true', "a: return b", "\\"),
					// the cases of a switch over data's domain, but as strings
					Domains: type("'string' | 'number' | 'object'"),
					Dispatched: type({ k: "'case \"string\":'" })
						.or({ k: "'b: return true\u2028'" })
						.or("string")
				},
				[
					'case "a": return true',
					"a: return b",
					"\\",
					"string",
					"object",
					null,
					{ k: 'case "string":' },
					{ k: "b: return true\u2028" },
					{ k: "case" },
					0
				]
			)
		})

		it("loops over checks whose literals read as a loop's", async () => {
			await agreesInEachBuild(
				{
					Looped: type({
						"for (;;) {": type.enumerated("${", "`", '"', "\\\\"),
						"\u2028        break": "string.url",
						"const errorCount = ctx.currentErrorCount\n": "number",
						"    return false\u2028 }": "string"
					})
				},
				[
					{
						"for (;;) {": "${",
						"\u2028        break": "https://arktype.io",
						"const errorCount = ctx.currentErrorCount\n": 0,
						"    return false\u2028 }": ""
					},
					{
						"for (;;) {": "\\",
						"\u2028        break": "https://arktype.io",
						"const errorCount = ctx.currentErrorCount\n": 0,
						"    return false\u2028 }": ""
					},
					{
						"for (;;) {": "`",
						"\u2028        break": "arktype",
						"const errorCount = ctx.currentErrorCount\n": 0,
						"    return false\u2028 }": ""
					},
					{
						"for (;;) {": '"',
						"\u2028        return false": "https://arktype.io",
						"const errorCount = ctx.currentErrorCount\n": 0,
						"    return false\u2028 }": ""
					}
				]
			)
		})
	})

	it("size allows as a filter callback", async () => {
		const { T } = await load(
			{ T: type({ id: "number", tags: "string[]", "note?": "'a' | 'b'" }) },
			{ optimize: "size" }
		)
		const valid = { id: 1, tags: ["x"], note: "a" }
		attest(
			[valid, { id: 1, tags: [0] }, { id: 1, tags: [], note: "c" }].filter(
				T.allows
			)
		).equals([valid])
	})

	it("size checks a URL by the URL parser alone", async () => {
		const Url = type("string.url")
		const { T } = await load({ T: Url }, { optimize: "size" })
		const inputs = [
			"https://arktype.io/docs?q=1#a",
			"HTTP://a-b.c:80",
			"http://[::1]:8080",
			"mailto:a@b.c",
			"http://a b",
			"arktype.io",
			""
		]
		attest(inputs.filter(T.allows)).equals(inputs.filter(Url.allows))
	})

	it("index signature with a defaulted key", async () => {
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
		agrees(validators, types, inputs)
	})

	it("array indices through the greatest", async () => {
		const types = {
			rejected: type("string[]").onUndeclaredKey("reject"),
			deleted: type("string[]").onUndeclaredKey("delete")
		}
		const validators = await load(types)
		// a Proxy lists a huge index on a short array, which is quick to check
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
		agrees(validators, types, [greatest, past, named])
		attest(validators.rejected.allows(greatest)).equals(true)
		attest(validators.rejected.allows(past)).equals(false)
		attest(Object.keys(validators.deleted(greatest))).equals([
			"0",
			"4294967294"
		])
		attest(validators.deleted(named)).equals(["a"])
	})

	it("issues", async () => {
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

	it("issues found once read", async () => {
		const { T } = await load({ T: type({ a: "string", b: "number" }) })
		const data: Record<string, unknown> = { a: 0, b: 0 }
		const errors = T(data)
		data.a = "a"
		data.b = "b"
		attest(errors.summary).snap("b must be a number")
		data.b = 0
		attest(errors.summary).snap("b must be a number")
	})

	it("issues found as it validates for size", async () => {
		const { T } = await load(
			{ T: type({ a: "string", b: "number" }) },
			{ optimize: "size" }
		)
		const data: Record<string, unknown> = { a: 0, b: 0 }
		const errors = T(data)
		data.a = "a"
		attest(errors.summary).snap("a must be a string")
	})

	it("issues of data made valid before they're read", async () => {
		const { T } = await load({ T: type({ a: "string" }) })
		const data: Record<string, unknown> = { a: 0 }
		const errors = T(data)
		data.a = "a"
		attest(errors.issues).snap([
			{
				code: "predicate",
				path: [],
				data: { a: "a" },
				expected: undefined,
				message: "is invalid"
			}
		])
	})

	it("issues found as it validates where it calls a narrow", async () => {
		const always = standIn(() => true, "always")
		const T = (
			await loadFactory(type({ a: "string", b: "number" }).narrow(always), [
				["function", "always", always]
			])
		)(always)
		const data: Record<string, unknown> = { a: 0, b: 0 }
		const errors = T(data)
		data.a = "a"
		attest(errors.summary).snap("a must be a string")
	})

	it("paths of reentrant validations", async () => {
		const { Inner, Outer } = await load({
			Inner: type({ x: { y: "string" } }),
			Outer: type({ a: "string", b: { c: "string" } })
		})
		const pathsOf = (result: any) =>
			result.issues.map((issue: { path: unknown }) => issue.path)
		const invalid = { a: 1, b: {} }
		attest(pathsOf(Outer(invalid))).equals([["a"], ["b", "c"]])
		let innerResult: unknown
		// read by Outer's Apply at b, then as it writes the issue at b.c
		const reentering = {
			a: 1,
			b: {
				get c() {
					innerResult = Inner({ x: { y: 1 } })
					return 1
				}
			}
		}
		attest(pathsOf(Outer(reentering))).equals([["a"], ["b", "c"]])
		attest(pathsOf(innerResult)).equals([["x", "y"]])
		const throwing = {
			a: 1,
			b: {
				get c() {
					return Inner.assert({ x: 1 })
				}
			}
		}
		attest(() => Outer(throwing).issues).throws("x must be an object")
		attest(pathsOf(Outer(invalid))).equals([["a"], ["b", "c"]])
		attest(pathsOf(Inner({ x: 1 }))).equals([["x"]])
	})

	it("stops at its first failing keyword check", async () => {
		const T = type("string.url & string.date")
		const { T: validator } = await load({ T })
		attest(validator("nope").summary).snap("must be a URL string")
		attest(validator("http://example.com").summary).snap(
			"must be a parsable date"
		)
	})

	it("issues at one path stay apart", async () => {
		const T = type({ "[/^a/]": "string[] >= 2", "[/a$/]": "unknown[] <= 0" })
		const { T: validator } = await load({ T })
		attest(validator({ a: ["q"] }).summary).snap(`a must be at least length 2
a must be exactly length 0`)
	})

	it("root array issues from its first rejected element", async () => {
		const types = {
			Objects: type({ x: "number" }).array(),
			Strings: type("string > 1").array()
		}
		const validators = await load(types)
		const { Objects: first } = await load(
			{ Objects: types.Objects },
			{ errors: "first" }
		)
		const data = [{ x: 0 }, { x: "a" }, { x: 1 }, {}]
		const piped = type("unknown").pipe((data, ctx) =>
			validators.Objects(data, ctx)
		)
		attest([
			validators.Objects(data).summary,
			first(data).summary,
			validators.Objects({}).summary,
			String(piped(data))
		]).snap([
			"[1].x must be a number\n[3].x is missing",
			"[1].x must be a number",
			"must be an array",
			"value at [1].x must be a number\nvalue at [3].x is missing"
		])
		agrees(validators, types, [
			data,
			[],
			[{ x: 0 }],
			[{ x: "a" }, { x: 0 }],
			["ab", "a", "bc", 1],
			{}
		])
	})

	it("root array validated within its own validation", async () => {
		const { T } = await load({ T: type({ x: "number" }).array() })
		let inner: unknown
		// read as the outer call checks its first element
		const reentering = {
			get x() {
				inner = T([{ x: 0 }, { x: 1 }, { x: "b" }]).summary
				return 0
			}
		}
		attest(T([reentering, { x: "a" }]).summary).snap("[1].x must be a number")
		attest(inner).snap("[2].x must be a number")
	})

	it("root array reads elements before its first rejected once", async () => {
		const { T } = await load({ T: type({ x: "number" }).array() })
		let reads = 0
		const counted: unknown[] = [undefined, { x: "a" }]
		Object.defineProperty(counted, 0, { get: () => (reads++, { x: 0 }) })
		attest(T(counted).summary).snap("[1].x must be a number")
		attest(reads).equals(1)
	})

	it("root array checks an element a getter replaced", async () => {
		const types = { T: type({ x: "number" }).array() }
		const { T } = await load(types)
		const replacing: unknown[] = [undefined, { x: 0 }, { x: 1 }]
		Object.defineProperty(replacing, 0, {
			get: () => ((replacing[2] = { x: "c" }), { x: 0 }),
			enumerable: true
		})
		agrees({ T }, types, [replacing])
		attest(T(replacing).summary).snap("[2].x must be a number")
	})

	it("issues into a morph's traversal", async () => {
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

	it("issues into a validator's traversal", async () => {
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
		// by the runtime's createValidator, then by a creator the build writes
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
				{ members }
			)
			Inner = created.Inner
			attest(String(created.Wrapping(wrap)({ a: { n: "x" } }))).equals(
				"n must be a number"
			)
			attest(String(created.Defaulted(isLong, next)({}))).equals(
				"a must be long"
			)
		}
		const undetailed = await load(
			{
				Inner: type({ n: "number" }),
				Wrapping: {
					type: type({ a: "unknown" }).pipe(wrap),
					params: [{ kind: "function", label: "`wrap`", value: wrap }]
				}
			},
			{ errors: "none" }
		)
		Inner = undetailed.Inner
		attest(String(undetailed.Wrapping(wrap)({ a: { n: "x" } }))).equals(
			"is invalid"
		)
	})

	it("errors: none, read below the root", async () => {
		let Inner: (data: unknown, ctx: Traversal) => unknown = () => {}
		let read: unknown
		const check = standIn((o: { n: unknown }, ctx: Traversal) => {
			Inner(o.n, ctx)
			read = ctx.errors.issues
			return o
		}, "check")
		const created = await load(
			{
				Inner: type("number"),
				Nested: {
					type: type({ a: type({ n: "unknown" }).pipe(check) }),
					params: [{ kind: "function", label: "`check`", value: check }]
				}
			},
			{ errors: "none" }
		)
		Inner = created.Inner
		attest(String(created.Nested(check)({ a: { n: "x" } }))).equals(
			"is invalid"
		)
		attest(read).equals([
			{ code: "predicate", path: ["a"], data: "x", message: "is invalid" }
		])
	})

	it("members: false omits each", async () => {
		const T = type({ name: "string", "tags?": "string[]" })
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
			const { T: validator } = await load(
				{ T },
				{ members: { [member]: false } }
			)
			attest(membersOf(validator)).equals({ ...all, [member]: false })
			attest(validator({ name: "a" })).equals({ name: "a" })
			attest(validator({}).summary).equals(full({}).summary)
		}
		const { T: validator } = await load(
			{ T },
			{
				members: {
					assert: false,
					meta: false,
					"~standard": false,
					methods: false,
					expression: true
				}
			}
		)
		attest(Object.keys(validator)).equals(["expression", "allows"])
		attest(Object.getPrototypeOf(validator)).is(Function.prototype)
		attest(Object.isFrozen(validator)).equals(true)
		attest(validator({ name: "a" })).equals({ name: "a" })
		attest(validator.allows({ name: "a", tags: [1] })).equals(false)
		attest(validator({ tags: [1] }).summary).snap(`name is missing
tags[0] must be a string`)
	})

	it("piped into ignores configured onFail", async () => {
		const config: ArkSchemaConfig = { onFail: errors => errors.throw() }
		for (const members of [{}, { methods: false }]) {
			const { T } = await load(
				{ T: type({ a: "string" }) },
				{
					configure: `runtime.configure({ onFail: errors => errors.throw() }, "${fingerprintOf(config)}")`,
					fingerprint: fingerprintOf(config),
					members
				}
			)
			const Piping = type("unknown").pipe((data, ctx) => T(data, ctx))
			attest(String(Piping({ a: 1 }))).equals("a must be a string")
		}
	})

	it("matcher without meta", async () => {
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

	it("keeps members the runtime reads", async () => {
		const Defaulted = type({ n: ["string.numeric.parse", "=", "1"] })
		const { Defaulted: defaulted } = await load(
			{ Defaulted },
			{ members: { methods: false } }
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

	it("issues after existing ones", async () => {
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

	it("rewrites an issue a callback read", async () => {
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

	it("island pipe with throwing onFail", async () => {
		const config: ArkSchemaConfig = { onFail: errors => errors.throw() }
		const fingerprint = fingerprintOf(config)
		// by createValidatorWith, then built creators, with and without traverse
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

	it("freeze: false", async () => {
		const T = type({ name: "string" })
		const { T: frozen } = await load({ T })
		const { T: validator } = await load(
			{ T },
			{ members: { toJSON: true }, freeze: false }
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

	it("bakes configured meta only", async () => {
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

	it("errors: first", async () => {
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
			"b must be a number",
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

	it("errors: first reports one of the issues", async () => {
		const exports = { T: type({ a: "string[]", b: "number" }) }
		const [all, first] = await Promise.all(
			(["all", "first"] as const).map(async errors =>
				(await load(exports, { errors })).T({ a: [1], b: "2" })
			)
		)
		attest(all.summary.split("\n")).snap([
			"a[0] must be a string",
			"b must be a number"
		])
		attest(first.issues.length).equals(1)
		attest(all.summary.split("\n").includes(first.summary)).equals(true)
	})

	it("errors: none", async () => {
		const exports = {
			Object: type({ a: "string", b: { c: "number[]" } }),
			Trimmed: type({ a: "string.trim" }),
			Parsed: type({ b: "string.json.parse" }),
			Union: type({ a: "string.trim", b: "string > 5" }).or({
				b: "string < 3"
			}),
			Piped: type("string.trim").to("string.json"),
			Cyclic: scope({ node: { value: "number", "next?": "node" } }).export()
				.node,
			CyclicTrimmed: scope({
				node: { value: "string.trim", "next?": "node" }
			}).export().node,
			ParsedCyclic: type("string.json.parse").to(
				scope({ node: { value: "number", "next?": "node" } }).type("node")
			)
		}
		const validators = await load(exports, { errors: "none" })
		// one root apply of each kind, and each through a cycle
		const inputs: { [name in keyof typeof exports]: [valid: {}, invalid: {}] } =
			{
				Object: [
					{ a: "a", b: { c: [1] } },
					{ a: 1, b: { c: ["c"] } }
				],
				Trimmed: [{ a: " a " }, { a: 1 }],
				Parsed: [{ b: "[1]" }, { b: "[" }],
				Union: [{ a: " a ", b: "bbbbbb" }, { b: "bbbb" }],
				Piped: [" {} ", " { "],
				Cyclic: [
					{ value: 1, next: { value: 2 } },
					{ value: 1, next: { value: "2" } }
				],
				CyclicTrimmed: [
					{ value: " a ", next: { value: " b " } },
					{ value: " a ", next: { value: 2 } }
				],
				ParsedCyclic: [
					'{ "value": 1, "next": { "value": 2 } }',
					'{ "value": "1" }'
				]
			}
		for (const [name, [valid, invalid]] of Object.entries(inputs)) {
			attest(validators[name](valid)).equals(
				exports[name as keyof typeof exports](valid)
			)
			attest(validators[name](invalid).issues).equals([
				{ code: "predicate", path: [], data: invalid, message: "is invalid" }
			])
		}
	})

	it("errors: none assert", async () => {
		const { T } = await load({ T: type({ a: "string" }) }, { errors: "none" })
		const thrown = caught(() => T.assert({ a: 1 }))
		attest(thrown.constructor).is(Error)
		attest(String(thrown)).equals("Error: is invalid")
		attest(thrown.cause.issues).equals([
			{ code: "predicate", path: [], data: { a: 1 }, message: "is invalid" }
		])
		const config: ArkSchemaConfig = { onFail: errors => errors.throw() }
		const { Configured } = await load(
			{ Configured: type({ a: "string" }) },
			{
				configure: `runtime.configure({ onFail: errors => errors.throw() }, "${fingerprintOf(config)}")`,
				fingerprint: fingerprintOf(config),
				errors: "none"
			}
		)
		attest(() => Configured({ a: 1 })).throws.snap(
			"TypeError: errors.throw is not a function"
		)
	})

	it("loads without a global it reads", async () => {
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

	it("bakes listed introspection", async () => {
		const T = type({ name: "string", "tags?": "string[]" })
		const { T: validator } = await load(
			{ T },
			{
				members: {
					json: true,
					toJSON: true,
					toJsonSchema: true,
					"~standard.jsonSchema": true
				}
			}
		)
		attest(validator.json).equals(T.json)
		attest(validator.toJSON()).is(validator.json)
		attest(JSON.stringify(validator)).equals(JSON.stringify(T))
		attest(validator.toJsonSchema()).equals(T.toJsonSchema())
		// a new schema each call, as arktype writes one
		attest(validator.toJsonSchema() === validator.toJsonSchema()).equals(false)
		for (const io of ["input", "output"] as const) {
			for (const target of [
				"draft-2020-12",
				"draft-07",
				"openapi-3.0"
			] as const) {
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
			validator["~standard"].jsonSchema.input({ target: "draft-04" })
		).throws(writeInvalidJsonSchemaTargetMessage("draft-04"))
		// no options, or only a target whose schema is baked
		attest(validator.toJsonSchema({})).equals(T.toJsonSchema({}))
		for (const target of [
			"draft-2020-12",
			"draft-07",
			"openapi-3.0"
		] as const) {
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

	it("takes only targets it was built with", async () => {
		const T = type({ a: "string" })
		const { T: validator } = await load(
			{ T },
			{ members: { toJsonSchema: true } }
		)
		attest(validator.toJsonSchema({ target: "draft-2020-12" })).equals(
			T.toJsonSchema({ target: "draft-2020-12" })
		)
		attest(() => validator.toJsonSchema({ target: "draft-07" })).throws(
			'a standalone validator\'s JSON Schema takes only a target it was built with; configure({ toJsonSchema }) or build with runtime: "arktype"'
		)
	})

	it("bakes only listed introspection", async () => {
		const { T } = await load(
			{ T: type({ a: "string" }) },
			{ members: { toJsonSchema: true } }
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

	it("introspection prints received functions", async () => {
		const length = standIn((s: string) => s.length, "length")
		const T = type("string").pipe(length)
		const json = T.json
		const message = String(caught(() => T.toJsonSchema()))
		const create = await loadFactory(T, [["function", "length", length]], {
			json: true,
			toJsonSchema: true
		})
		Object.defineProperty(length, "name", { value: "introspected" })
		const validator = create(length)
		attest(json).snap({ in: "string", morphs: ["$ark.$hole_length"] })
		attest(validator.json).snap({ in: "string", morphs: ["$ark.introspected"] })
		attest(message)
			.snap(`ToJsonSchemaError: Can't convert "morph" to JSON Schema. Configure fallback.morph to write it:
{
    code: "morph",
    base: {
        type: "string"
    },
    out: null
}`)
		attest(String(caught(() => validator.toJsonSchema()))).equals(message)
		attest(jsonSchemaErrorOf(validator)).equals(jsonSchemaErrorOf(T))
	})

	it("ToJsonSchemaError context", async () => {
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
		const validators = await load(Types, { members: { toJsonSchema: true } })
		const sites = await load(
			flatMorph(Types, (name, T) => {
				const site: StandaloneExport = {
					member: "toJsonSchema",
					type: T.internal,
					data: undefined,
					params: [],
					thrown: caught(() => T.toJsonSchema())
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

	it("frozen shared json", async () => {
		const { A, B } = await load(
			{ A: type({ a: "string" }), B: scope({}).type({ a: "string" }) },
			{ members: { json: true } }
		)
		attest(() => {
			A.json.required[0].key = "b"
		}).throws.snap(
			"TypeError: Cannot assign to read only property 'key' of object '#<Object>'"
		)
		attest(B.json).equals(type({ a: "string" }).json)
	})

	it("Dates and RegExps stay apart", async () => {
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
			{ members: { toJsonSchema: true } }
		)
		const [regex, date] = A.meta.examples
		const [otherRegex, otherDate] = B.meta.examples
		regex.exec("aaa")
		Date.prototype.setTime.call(date, 1)
		attest([
			otherRegex.lastIndex,
			otherDate.getTime(),
			caught(() => U.toJsonSchema()).context.unit.getTime()
		]).equals([0, 0, 0])
		// held as arktype holds them
		attest([Object.isFrozen(date), Object.getOwnPropertyNames(date)]).equals([
			false,
			[]
		])
	})

	it("RegExp lastIndex", async () => {
		const held = /a/g
		held.lastIndex = 2
		const { T } = await load({
			T: type("string").configure({ examples: [held] as never })
		})
		attest(T.meta.examples[0].lastIndex).equals(2)
	})

	it("JSON Schema calling a default thunk", async () => {
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

	it("JSON Schema whose writing throws", async () => {
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
		const { T: validator } = await load(
			{ T },
			{ members: { toJsonSchema: true } }
		)
		attest(() => T.toJsonSchema()).throws("no schema")
		attest(() => validator.toJsonSchema()).throws(
			writeUnbakedMessage(
				`${writeUnprecompilableMessage("a JSON Schema whose writing throws")}: Error: no schema`
			)
		)
		agrees({ T: validator }, { T }, [new Date(0)])
	})

	it("unsatisfiable JSON Schema view", async () => {
		// the output requires a default the index signature's value excludes
		const T = type({ a: ["string = 'a'"], "[string]": "number[]" })
		const { T: validator } = await load(
			{ T },
			{ members: { "~standard.jsonSchema": true } }
		)
		const thrown = (t: typeof T) => {
			const e = caught(() =>
				t["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			)
			return [e.constructor.name, e.message]
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

	it("no members needing arktype", async () => {
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

	it("configured message writer", async () => {
		const write = standIn(
			(ctx: MessageContext) =>
				`${ctx.propString}: ${ctx.actual} isn't ${ctx.expected}`,
			"write"
		)
		const T = type({ a: type("string > 1").configure({ message: write }) })
		const create = await loadFactory(T, [["function", "`write`", write]])
		const summary = create(write)({ a: "x" }).summary
		attest(summary).equals(T({ a: "x" }).toString())
		attest(summary).snap("a: 1 isn't at least length 2")
	})

	it("configured problem and actual writers", async () => {
		const problem = standIn(
			(ctx: ProblemContext) => `is ${ctx.actual}, not ${ctx.expected}`,
			"problem"
		)
		const actual = standIn((data: unknown) => typeof data, "actual")
		const T = type({ a: type("number").configure({ problem }) }).and({
			b: type("number").configure({ actual })
		})
		const create = await loadFactory(T, [
			["function", "`problem`", problem],
			["function", "`actual`", actual]
		])
		attest(create(problem, actual)({ a: "x", b: "y" }).issues).snap([
			{
				code: "domain",
				path: ["a"],
				data: "x",
				expected: "a number",
				message: "a is a string, not a number",
				problem: "is a string, not a number"
			},
			{
				code: "domain",
				path: ["b"],
				data: "y",
				expected: "a number",
				message: "b must be a number (was string)",
				problem: "must be a number (was string)"
			}
		])
	})

	it("configured expected writer", async () => {
		const expected = standIn(
			(ctx: ExpectedContext) => `${ctx.description}, as written`,
			"expected"
		)
		const create = await loadFactory(type("number").configure({ expected }), [
			["function", "`expected`", expected]
		])
		attest(create(expected)("x").issues[0]).snap({
			code: "domain",
			path: [],
			data: "x",
			expected: "a number, as written",
			message: "must be a number, as written"
		})
	})

	it("writes text when its errors are first read", async () => {
		let calls = 0
		const write = standIn(() => `${++calls}`, "write")
		const T = type({ a: type("string").configure({ message: write }) })
		const create = await loadFactory(T, [["function", "`write`", write]])
		const errors = create(write)({ a: 1 })
		attest([errors.count, calls]).equals([1, 0])
		attest(errors.summary).equals("1")
		attest(errors.issues[0].message).equals("1")
		attest(calls).equals(1)
	})

	it("refuses a union's writer", () => {
		const write = standIn(() => "written", "write")
		attest(() =>
			precompileStandalone({
				T: {
					type: type("string | number").configure({ message: write }),
					params: [{ kind: "function", label: "`write`", value: write }]
				}
			})
		).throws(
			writeUnprecompilableMessage(
				"`number | string`'s message writer, which reads each branch's errors"
			)
		)
	})

	it("configured message", async () => {
		const Login = type({
			email: type("string.email").configure({ message: "Enter your email." }),
			password: "string >= 8"
		}).configure({ message: "Enter your login." })
		const { Login: validator } = await load({ Login })
		attest(validator({ email: "x", password: "" }).summary)
			.snap(`Enter your email.
password must be at least length 8`)
		attest(validator(null).summary).snap("Enter your login.")
	})

	it("configured pipe message", async () => {
		const T = type("string.numeric.parse")
			.to("number < 3")
			.configure({ message: "Enter a number below 3." })
		const { T: validator } = await load({ T })
		attest(validator("5").summary).equals(T("5").toString())
		attest(validator("5").summary).snap("Enter a number below 3.")
	})

	it("configured problem", async () => {
		const { T } = await load({
			T: type({ a: type("string").configure({ problem: "is no string" }) })
		})
		attest(T({ a: 1 }).issues[0]).snap({
			code: "domain",
			path: ["a"],
			data: 1,
			expected: "a string",
			message: "a is no string",
			problem: "is no string"
		})
	})

	it("configured problem at an index", async () => {
		const { T } = await load({
			T: type(type("string").configure({ problem: "is no string" }), "[]")
		})
		attest(T([1]).summary).snap("[0] is no string")
	})

	it("configured actual", async () => {
		const { T } = await load({
			T: type({ a: type("string").configure({ actual: "not text" }) })
		})
		attest(T({ a: 1 }).summary).snap("a must be a string (was not text)")
	})

	it("configured message at a missing key", async () => {
		const { T } = await load({
			T: type({ a: "string" }).configure(
				{ message: "a is required" },
				"required"
			)
		})
		attest([T({}).summary, T({ a: 1 }).summary]).snap([
			"a is required",
			"a must be a string"
		])
	})

	it("configured union message", async () => {
		const { Indiscriminable, Discriminated, Keyed } = await load({
			Indiscriminable: type({ a: "string" })
				.or({ b: "number" })
				.configure({ message: "neither" }),
			Discriminated: type({ k: "'a'", a: "string" })
				.or({ k: "'b'", b: "number" })
				.configure({ message: "unknown kind" }),
			Keyed: type({ a: type("string | number").configure({ message: "no a" }) })
		})
		attest([
			Indiscriminable({}).summary,
			Discriminated({ k: "c" }).summary,
			Keyed({ a: true }).summary
		]).snap(["neither", "unknown kind", "no a"])
	})

	it("configured undeclared message", async () => {
		const { T } = await load({
			T: type({ "+": "reject", a: "string" }).configure(
				{ message: "no extra keys" },
				"structure"
			)
		})
		attest(T({ a: "", b: 1 }).summary).snap("no extra keys")
	})

	it("callback error text", async () => {
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

	it("refuses scope error text", () => {
		const $ = scope(
			{ T: { a: "string" } },
			{ domain: { message: "configured" } }
		)
		attest(() => precompileStandalone({ T: $.export().T })).throws(
			writeUnprecompilableMessage("a scope's configured domain message")
		)
		attest(() =>
			precompileStandalone({
				S: scope({}, { unit: { expected: "an a" } }).type("'a'")
			})
		).throws(writeUnprecompilableMessage("a scope's configured unit expected"))
	})

	it("program configuration", async () => {
		const config: ArkSchemaConfig = {
			onFail: errors => errors.issues.map(issue => issue.code)
		}
		const { T } = scope(
			{ T: { a: "string", b: "number % 2" } },
			config
		).export()
		const { T: validator } = await load(
			{ T: type({ a: "string", b: "number % 2" }) },
			{
				configure: `runtime.configure({
	onFail: errors => errors.issues.map(issue => issue.code)
}, "${fingerprintOf(config)}")`,
				fingerprint: fingerprintOf(config)
			}
		)
		const input = { a: 1, b: 3 }
		attest(validator(input)).equals(T(input))
		attest(validator(input)).snap(["domain", "divisor"])
	})

	it("mutatesInput: true writes input", async () => {
		const User = type({
			name: "string.trim",
			tags: "string.trim[]",
			role: "string = 'user'"
		})
		const copied = { name: " a ", tags: [" b "] }
		attest((await load({ User })).User(copied)).equals({
			name: "a",
			tags: ["b"],
			role: "user"
		})
		attest(copied).equals({ name: " a ", tags: [" b "] })
		const mutating = (await load({ User }, { mutatesInput: true })).User
		const tags = [" b "]
		const written: Record<string, unknown> = { name: " a ", tags }
		attest(mutating(written)).is(written)
		attest(written).equals({ name: "a", tags: ["b"], role: "user" })
		attest(written.tags).is(tags)
		attest(() =>
			mutating(Object.freeze({ name: " a ", tags: [], role: "admin" }))
		).throws("Cannot assign to read only property 'name'")
	})

	it("mutatesInput: true returns its input", async () => {
		const { Props, Index, Tuple } = await load(
			{
				Props: type({ name: "string.trim", role: "string = 'user'" }),
				Index: type({ "[string]": "string.trim" }),
				Tuple: type(["string.trim", "string = 'x'"])
			},
			{ mutatesInput: true }
		)
		const inputs: unknown[] = [{ name: " a " }, { k: " b " }, [" c "]]
		attest(
			[Props, Index, Tuple].map(
				(validate, i) => validate(inputs[i]) === inputs[i]
			)
		).equals([true, true, true])
		attest(inputs).equals([{ name: "a", role: "user" }, { k: "b" }, ["c", "x"]])
	})

	it("mutatesInput copies to delete keys", async () => {
		const exports = {
			Strict: type({
				"+": "delete",
				name: "string.trim",
				inner: { v: "string.trim" }
			}),
			Pair: type({
				a: { v: "string" },
				b: { v: "string", "w?": "string" }
			}).onDeepUndeclaredKey("delete"),
			List: type({ v: "string.trim" }).array().onDeepUndeclaredKey("delete")
		}
		const { Strict, Pair, List } = await load(exports, { mutatesInput: true })
		const inner = { v: " v " }
		const input = { name: " a ", inner, extra: 1 }
		const out = Strict(input)
		attest(out).equals({ name: "a", inner: { v: "v" } })
		attest(out.inner).is(inner)
		attest(input).equals({ name: " a ", inner: { v: "v" }, extra: 1 })
		class Named {
			name = " n "
			inner = { v: "w" }
			extra = 1
		}
		const named = new Named()
		const copied = Strict(named)
		attest(Object.getPrototypeOf(copied)).is(Named.prototype)
		attest({ ...copied }).equals({ name: "n", inner: { v: "w" } })
		attest({ ...named }).equals({ name: " n ", inner: { v: "w" }, extra: 1 })
		const shared = { v: "x", w: "y", extra: 1 }
		attest(Pair({ a: shared, b: shared })).equals({
			a: { v: "x" },
			b: { v: "x", w: "y" }
		})
		const list = [{ v: " x ", extra: 1 }]
		attest(List(list)).equals([{ v: "x" }])
		attest(list).equals([{ v: " x ", extra: 1 }])
	})

	it("mutatesInput as arktype", async () => {
		const defs = {
			item: { n: "string.numeric.parse" },
			Items: "item[]",
			Shared: { a: "item", b: { n: "string" } },
			Strip: { "+": "delete", a: "item" },
			node: { value: "string.trim", "next?": "node" }
		} as const
		const shared = { n: "1" }
		const cyclic: Record<string, unknown> = { value: " c " }
		cyclic.next = cyclic
		const inputs: Record<string, unknown[]> = {
			Items: [
				[{ n: "1" }, { n: "2" }],
				[shared, shared]
			],
			Shared: [
				{ a: { n: "1" }, b: { n: "2" } },
				{ a: shared, b: shared }
			],
			Strip: [{ a: { n: "1" }, extra: 1 }],
			Node: [{ value: " a ", next: { value: " b " } }, cyclic]
		}
		for (const mutatesInput of [true, "always"] as const) {
			const $ = scope(defs, { mutatesInput }).export()
			const exports = {
				Items: $.Items,
				Shared: $.Shared,
				Strip: $.Strip,
				Node: $.node
			}
			const validators = await load(exports, { mutatesInput })
			for (const [name, T] of Object.entries(exports)) {
				for (const input of inputs[name]) {
					const expected = structuredClone(input)
					const actual = structuredClone(input)
					const expectedOut: unknown = T(expected)
					const actualOut: unknown = validators[name](actual)
					attest([
						name,
						mutatesInput,
						isDeepStrictEqual(actualOut, expectedOut),
						isDeepStrictEqual(actual, expected),
						actualOut === actual
					]).equals([name, mutatesInput, true, true, expectedOut === expected])
				}
			}
		}
	})

	it("mutatesInput inside a copying Type", async () => {
		const Item = type({ n: "string.numeric.parse" })
		const { Held, Items } = await load(
			{
				Held: type({ item: Item }),
				Items: Item.array()
			},
			{ mutatesInput: true }
		)
		const item = { n: "1" }
		const held = { item }
		attest(Held(held)).is(held)
		attest(item as object).equals({ n: 1 })
		const shared = { n: "2" }
		attest(Items([shared, shared])).equals([{ n: 2 }, { n: 2 }])
		attest(shared).equals({ n: "2" })
	})

	it("mutatesInput from the build", async () => {
		const { T: written } = await load(
			{ T: type({ n: "string.numeric.parse" }) },
			{ mutatesInput: true }
		)
		const input = { n: "1" }
		attest(written(input)).is(input)
		attest(input as object).equals({ n: 1 })
		const { T: copied } = await load({
			T: scope(
				{ T: { n: "string.numeric.parse" } },
				{ mutatesInput: true }
			).export().T
		})
		const kept = { n: "1" }
		attest(copied(kept)).equals({ n: 1 })
		attest(kept).equals({ n: "1" })
	})

	it("mutatesInput with errors: none", async () => {
		const { List, Node } = await load(
			{
				List: type({ j: "string.json.parse" }).array(),
				Node: scope({
					node: { value: "string.trim", "next?": "node" }
				}).export().node
			},
			{ mutatesInput: "always", errors: "none" }
		)
		const list = [{ j: "1" }]
		attest(List(list)).is(list)
		attest(list as object).equals([{ j: 1 }])
		const node = { value: " a ", next: { value: " b " } }
		attest(Node(node)).is(node)
		attest(node).equals({ value: "a", next: { value: "b" } })
		attest(List([{ j: 1 }]).summary).equals("is invalid")
	})

	describe("countsKeys", () => {
		const Strict = type({ "+": "reject", a: "string", "b?": "number" })

		it("rejects an undeclared key", async () => {
			const { T } = await load({ T: Strict }, { countsKeys: true })
			attest(T({ a: "", c: 1 }).summary).snap("c must be removed")
			attest(T({ a: "", b: 0, c: 1 }).summary).snap("c must be removed")
		})

		it("counts an optional key where present", async () => {
			const { T } = await load({ T: Strict }, { countsKeys: true })
			const absent = { a: "" }
			const present = { a: "", b: 0 }
			attest(T(absent)).is(absent)
			attest(T(present)).is(present)
		})

		it("passes an undeclared key in place of a declared one it doesn't count", async () => {
			const { T, U } = await load(
				{ T: Strict, U: type({ "+": "reject", toString: "Function" }) },
				{ countsKeys: true }
			)
			const nonEnumerable = Object.defineProperty({ c: 1 }, "a", {
				value: ""
			})
			const inherited = { c: 1 }
			attest(T(nonEnumerable)).is(nonEnumerable)
			attest(U(inherited)).is(inherited)
			// arktype's own Types, and builds without countsKeys, reject both
			attest(Strict(nonEnumerable).toString()).snap("c must be removed")
		})

		it("scans an object whose prototype isn't Object.prototype", async () => {
			const { T, Empty } = await load(
				{ T: Strict, Empty: type({ "+": "reject" }) },
				{ countsKeys: true }
			)
			const nullPrototype = Object.defineProperty(
				Object.assign(Object.create(null), { c: 1 }),
				"a",
				{ value: "" }
			)
			class Instance {
				c = 1
				get a() {
					return ""
				}
			}
			attest(T(nullPrototype).summary).snap("c must be removed")
			attest(T(new Instance()).summary).snap("c must be removed")
			attest(Empty(new Instance()).summary).snap("c must be removed")
		})

		it("counts a nested object's keys", async () => {
			const { T } = await load(
				{ T: type({ a: { b: "string" } }).onDeepUndeclaredKey("reject") },
				{ countsKeys: true }
			)
			const valid = { a: { b: "" } }
			attest(T(valid)).is(valid)
			attest(T({ a: { b: "", c: 1 } }).summary).snap("a.c must be removed")
		})
	})

	it("configured: false", async () => {
		const { T } = await load(
			{ T: type("string") },
			{
				configure: `runtime.configure({ onFail: errors => errors.issues.map(issue => issue.code) })`,
				configured: false
			}
		)
		attest(T(1).summary).equals("must be a string")
		attest(await messageOf("runtime.configure({})")).equals(
			configMismatchMessage
		)
	})

	it("configured: false without meta fails as a Type's own onFail says", async () => {
		const { Thrown, Returned } = await load(
			{
				Thrown: type("string").configure({
					onFail: runtimeThrowOnDefault
				} as never),
				Returned: type("string")
			},
			{
				configured: false,
				errors: "none",
				members: { assert: false, meta: false, "~standard": false }
			}
		)
		attest(() => Thrown(1)).throws("is invalid")
		attest(Returned(1).summary).equals("is invalid")
		attest(Returned(1, null, () => "called")).equals("called")
	})

	it("throws for another configuration", async () => {
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

	it("fingerprints apart differing values", () => {
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

	it("throws for a written configuration", async () => {
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
			[artifact.A, artifact.B].map(create => caught(create).message)
		).equals([writtenConfigMessage, writtenConfigMessage])
	})

	it("throws for a second configure()", async () => {
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

	it("creates validators lazily", async () => {
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

	it("lazy: false", async () => {
		attest(
			await importCode(
				bundle(
					precompileStandalone(
						{ T: type("string") },
						{
							configured: { fingerprint: fingerprintOf({}), path: "main.ts" },
							lazy: false
						}
					).code
				).js
			).then(
				() => "",
				(e: Error) => e.message
			)
		).equals(writeCreatedBeforeConfigureMessage("main.ts"))
	})

	it("fixes config on a Scope's first read", async () => {
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

	it("another scope's descriptions", async () => {
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
		agrees(validators, types, [input])
		attest(validators.ownFirst(input).summary).snap("a.v must be a number")
		attest(validators.keptAfter(input).summary).snap(
			"a.v must be a custom number"
		)
	})

	it("module exports", async () => {
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

	it("cyclic module data", async () => {
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
		const { a: A, b: B, Node, tree: Tree, Trees } = M
		agrees(validators, { a: A, b: B, Node, tree: Tree, Trees }, [
			a,
			bad,
			node,
			{ value: 1, next: { value: "2" } },
			tree
		])
	})

	it("Scope and Generic exports", async () => {
		const $ = scope({ "box<t>": { box: "t" }, a: "string" })
		const Box = type("<t>", { box: "t" })
		const { $: standIn, Box: box, M } = await load({ $, Box, M: $.export() })
		attest(standIn).equals({})
		attest(() => box("string")).throws.snap("TypeError: box is not a function")
		attest(M.box).equals({})
		attest(M.a("x")).equals("x")
		// an artifact without validators still declares its stand-ins
		const { Boxes } = await load({
			Boxes: scope({ "box<t>": { box: "t" } }).export()
		})
		attest(Boxes).equals({ box: {} })
	})

	it("Type in meta", async () => {
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

	it("freezes what a program reads", async () => {
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

	it("fails to link with another version's runtime", async () => {
		const { version } = readPackageJson(fromHere("..", "..", "type"))
		const failure = await build({
			...optionsOf(precompileStandalone({ T: type("string") }).code),
			plugins: [
				{
					name: "otherRuntime",
					setup: pluginBuild => {
						pluginBuild.onResolve({ filter: /^arktype\/runtime$/ }, () => ({
							path: "runtime",
							namespace: "other"
						}))
						pluginBuild.onLoad({ filter: /.*/, namespace: "other" }, () => ({
							contents: "export const precompiledForArktype_0_0_0 = true"
						}))
					}
				}
			]
		}).catch((e: { errors: { text: string }[] }) => e)
		attest("errors" in failure && failure.errors.map(e => e.text)).equals([
			`No matching export in "other:runtime" for import "precompiledForArktype_${version.replace(/\W/g, "_")}"`
		])
	})

	it("freezes with original builtins", async () => {
		const runtimeUrl = urlOf(bundle(`export * from "arktype/runtime"`).js)
		await import(runtimeUrl)
		const source = precompileStandalone({
			M: scope({ a: "string" }).export()
		}).code.replace(/"arktype\/runtime"/g, JSON.stringify(runtimeUrl))
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
			writeUnprecompilableMessage("a scope's configured domain message")
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
		const refusalOf = (value: object) =>
			caught(() =>
				precompileStandalone({
					T: type("string").configure({ value } as never)
				})
			).message
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

	it("writer for another code", async () => {
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

	it("refuses a union writer for a key", () => {
		const T = scope({}, { union: { message: () => "configured" } }).type({
			a: "boolean"
		})
		attest(() => precompileStandalone({ T })).throws(
			writeUnprecompilableMessage("a scope's configured union message")
		)
	})

	it("configured intersection writer", async () => {
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

	it("errors only in en", async () => {
		const { T } = await load({ T: type("string") })
		const errors = T(1)
		attest(errors.toLocaleString(de)).equals(errors.summary)
	})

	it("en beside a runtime island", async () => {
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

	it("island errors in any locale", async () => {
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
		it("creates from holes", async () => {
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
			agrees({ T: validator }, { T }, inputs)
			attest([validator.expression, validator.description]).equals([
				T.expression,
				T.description
			])
		})

		it("prints hole names", async () => {
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

		it("checks hole facts", async () => {
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

		it("takes a validator's holes", async () => {
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
					"another Type",
					"the Type it was at build"
				)
			)
			attest(() => create(validators.Described(trim))).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"another Type",
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
				{ members: {} }
			)
			attest(() => unlisted.User(unlisted.Text)).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"another Type",
					"the Type it was at build"
				)
			)
		})

		it("checks: none", async () => {
			const trim = (s: string) => s.trim()
			const builtTrim = standIn(trim.bind(null), "trim")
			const Name = type("string").pipe(builtTrim)
			const Text = type("string")
			const exports: Record<string, StandaloneExport> = {
				Name: {
					type: Name,
					params: [{ kind: "function", label: "`trim`", value: builtTrim }]
				},
				User: {
					type: type({ name: Name }),
					params: [{ kind: "input", label: "Name", reads: [[[], Name]] }]
				},
				Tagged: {
					type: type({ tag: Text }),
					params: [{ kind: "input", label: "Text", reads: [[[], Text]] }]
				},
				Other: type("number")
			}
			const checked = await load(exports)
			attest(() => checked.Tagged(checked.Other)).throws(
				writeCreationMismatchMessage(
					"`Text`",
					"another Type",
					"the Type it was at build"
				)
			)
			const trusting = await load(exports, { checks: "none" })
			// a mock replacing a Type goes unnoticed
			attest(trusting.Tagged(trusting.Other)({ tag: "a" })).equals({ tag: "a" })
			// but one holding functions is checked, as the factory takes them from it
			attest(trusting.User(trusting.Name(trim))({ name: " a " })).equals({
				name: "a"
			})
			attest(() => trusting.User(trusting.Other)).throws(
				writeCreationMismatchMessage(
					"`Name`",
					"Type<number>",
					"the Type it was at build"
				)
			)
		})

		it("takes a Scope's holes", async () => {
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

		it("tells Scopes apart", async () => {
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

		it("writes creations once", async () => {
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
			// a folded factory rekeys what creations wrote with its holes
			attest(
				precompileStandalone(exports)
					.code.split("const factory")
					.slice(1)
					.map(factory => /\(created\d+ \?\?= /.test(factory))
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

		it("folds alike factories", async () => {
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

		it("checks class lineage", async () => {
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
					"another Type",
					"the Type it was at build"
				)
			)
		})

		it("defaults from holes", async () => {
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
			agrees(validators, types, [
				{},
				["a"],
				{ at: new Date(1), n: 2 },
				{ children: [{}] }
			])
			attest(created.Thunk(() => new Date(1))({})).equals({
				at: new Date(1),
				n: 1
			})
			attest(created.Empty({}).values !== created.Empty({}).values).equals(true)
		})

		it("fills a default once", async () => {
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

		it("checks a default at creation", async () => {
			// stands in for a narrow the build can't call, so the default is valid
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

		it("default check with errors: none", async () => {
			const isEven = standIn((n: number) => n === n, "iseven")
			const T = type({ a: [["number", ":", isEven], "=", 3] })
			const optional = T.internal.references.find(node =>
				node.hasKind("optional")
			)!
			const { T: create } = await load(
				{
					T: {
						type: T,
						params: [{ kind: "function", label: "`isEven`", value: isEven }],
						defaultChecks: [[optional.value, 3, "a"]]
					}
				},
				{ errors: "none" }
			)
			attest(() =>
				create(function isEven(n: number) {
					return n % 2 === 0
				})
			).throws.snap("ParseError: Default for a is invalid")
		})

		it("wraps a TypedFn", async () => {
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

		it("hole received twice", async () => {
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

		it("functions named alike", async () => {
			// as `longer(n)` creates them, under one expression's placeholder
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

		it("compares received inputs", async () => {
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

		it("creates anew each call", async () => {
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

		it("interns created validators", async () => {
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

		it("checks helpers", async () => {
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

		it("rejects name-dependent order", () => {
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

		it("rejects arity-dependent order", () => {
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

		it("props in declared order", async () => {
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
			attest(JSON.stringify(create(Ot, jt)({}))).equals('{"start":1,"end":2}')
		})

		it("rejects order against a keyword", () => {
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

		it("rejects order on an unnamed hole", () => {
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

		it("completes only received names", () => {
			// one named otherwise prints in words like "and", unfindable by a factory
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

	it("shares config with islands", async () => {
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

	it("bundles only runtime code", () => {
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
			"schema/shared/enWriters.ts",
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
