import { attest, contextualize } from "@ark/attest"
import { fromHere, readPackageJson } from "@ark/fs"
import {
	$ark,
	type ArkSchemaConfig,
	type ExpectedContext,
	type MessageContext,
	type ProblemContext,
	writeInvalidJsonSchemaTargetMessage,
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
import { arkKindOf, flatMorph, hasDomain } from "@ark/util"
import { ark, generic, match, scope, type, type Scope } from "arktype"
import { de } from "arktype/locales/de"
import {
	precompileStandalone,
	writeUnprecompilableMessage,
	type FactoryParam,
	type StandaloneExport,
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

// as @ark/schema/runtime's variants bundle it, e.g. issuesNone.ts for issues.ts
const bundleWithIssues = async (
	source: string,
	issues: string
): Promise<string> => {
	const { outputFiles } = await build({
		...optionsOf(source),
		plugins: [
			{
				name: issues,
				setup: pluginBuild =>
					pluginBuild.onResolve({ filter: /\/issues\.ts$/ }, args =>
						join(args.resolveDir, args.path) === issuesPath ?
							{ path: join(issuesPath, "..", issues) }
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

// as a build configures main.ts by ./config.ts
const configuredBy = (fingerprint: string) => ({
	fingerprint,
	path: "main.ts",
	config: "./config.ts"
})

interface LoadOptions extends StandaloneOptions {
	// run before the artifact, as a program's config module is
	configure?: string
	fingerprint?: string | undefined
	// the issues module a build's errors resolve to, e.g. "issuesLean.ts"
	issues?: string
}

// each validator is read as a site reads it
const load = async (
	exports: Record<string, StandaloneExport>,
	{
		configure = "",
		fingerprint,
		members = printed,
		issues,
		...opts
	}: LoadOptions = {}
): Promise<Record<string, any>> => {
	const { code, folds } = precompileStandalone(exports, {
		...opts,
		configured:
			opts.configured ??
			(fingerprint === undefined ? undefined : configuredBy(fingerprint)),
		members
	})
	const source = code.replace(runtimeImport, `${runtimeImport}\n${configure}`)
	issues ??= opts.errors === "none" ? "issuesNone.ts" : undefined
	const artifact = await importCode(
		issues ? await bundleWithIssues(source, issues) : bundle(source).js
	)
	const validators = flatMorph(exports, (name, value) => {
		if (arkKindOf(value) !== undefined) return [name, artifact[name]()]
		const fold = folds[name]
		return [
			name,
			fold ?
				(...args: unknown[]) => artifact[fold[0]](fold[1], ...args)
			:	artifact[name]
		]
	})
	// `configure: exportsRuntime` reads the runtime as the program does
	return artifact.runtime ?
			{ ...validators, runtime: artifact.runtime }
		:	validators
}

// what creating a validator after the given configure() call throws
const messageOf = (configure: string, fingerprint?: string) =>
	load({ T: type("string") }, { configure, fingerprint }).then(
		() => "",
		(e: Error) => e.message
	)

const runtimeImport = `import * as runtime from "arktype/runtime"`

const exportsRuntime = "export { runtime }"

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
	// each artifact bundles its own runtime, whose errors have no arkKind
	hasDomain(result, "object") && "count" in result && "summary" in result ?
		{ issues: keptIssuesOf(result as never) }
	:	{ out: result, isInput: result === input }

const agrees = (
	validators: Record<string, any>,
	types: Record<string, type.Any>,
	inputs: unknown[]
) => {
	for (const [name, t] of Object.entries(types)) {
		// read off the validator, as a filter callback is
		const { allows } = validators[name]
		for (const input of inputs) {
			attest(observe(validators[name](input), input)).equals(
				observe(t(input), input)
			)
			attest(allows(input)).equals(t.allows(input))
		}
	}
}

// each failure's text, as a validator writes it
const textOf = (
	validators: Record<string, any>,
	cases: [name: string, input: unknown][]
) => cases.map(([name, input]) => String(validators[name](input)))

contextualize(() => {
	it("a union's domains checked for size", async () => {
		// by ternary, failing as arktype says
		const { domains } = await load(
			{
				domains: type("string | number > 0 | null | bigint | undefined").or({
					a: "string"
				})
			},
			{ optimize: "size" }
		)
		attest(
			[0, {}, () => {}, true, Symbol()].map(data => String(domains(data)))
		).snap([
			"must be positive",
			"a is missing",
			"a is missing",
			"must be a bigint, a string, a number, an object, undefined or null",
			"must be a bigint, a string, a number, an object, undefined or null"
		])
	})

	describe("checkers", () => {
		it("are what a size build writes", () => {
			const { code } = precompileStandalone(
				{ T: type({ name: "1 <= string <= 100", "tags?": "string[]" }) },
				{ optimize: "size" }
			)
			attest(
				code.match(/runtime\.(props|intersection|maxLength|minLength)\(/g)
			).equals([
				"runtime.props(",
				"runtime.intersection(",
				"runtime.maxLength(",
				"runtime.minLength(",
				"runtime.intersection("
			])
		})

		it("describe what each checks from its rule", async () => {
			const { T } = await load(
				{
					T: type({
						name: "1 <= string <= 100",
						role: "'admin' | 'guest' | 'member'",
						"age?": "number.integer >= 0",
						id: "string.uuid | null"
					})
				},
				{ optimize: "size" }
			)
			attest(T({ name: "", role: "owner", age: -1.5, id: 5 }).summary)
				.snap(`name must be non-empty
role must be "admin", "guest" or "member"
age must be an integer
age must be non-negative
id must be a string or null`)
		})

		it("check keys in the order they're declared", async () => {
			const { T } = await load(
				{ T: type({ "b?": "string", a: "string", c: "number = 1" }) },
				{ optimize: "size" }
			)
			attest(T({ b: 0, c: "" }).summary).snap(`b must be a string
a is missing
c must be a number`)
			attest(T({ a: "" })).equals({ a: "", c: 1 })
		})

		it("check each case by the branch it was told apart from", () => {
			const Card = type({ type: "'card'", last4: "string" })
			const { code } = precompileStandalone(
				{
					Card,
					Payment: Card.or({ type: "'bank'", iban: "string" }),
					Id: type("string.uuid | null")
				},
				{ optimize: "size" }
			)
			// pruned of what told them apart, the cases would be checkers of their own
			attest([
				code
					.match(/runtime\.props\({[^}]*}/g)
					?.every(call => call.includes("type: ")),
				code.match(/\/\^\(\?:\[\\dA-Fa-f]/g)?.length
			]).equals([true, 1])
		})

		it("copy an instance whose class writes its own tag", async () => {
			class Tagged {
				get [Symbol.toStringTag]() {
					return "Tagged"
				}
			}
			const { T } = await load(
				{ T: type({ k: "string = 'x'" }) },
				{ optimize: "size" }
			)
			const data: any = new Tagged()
			const out = T(data)
			attest([out === data, "k" in data, out instanceof Tagged, out.k]).equals([
				false,
				false,
				true,
				"x"
			])
		})

		it("write a builtin's default in place", async () => {
			const { T } = await load(
				{ T: type.instanceOf(Map).and({ k: "string = 'x'" }) },
				{ optimize: "size" }
			)
			const data: any = new Map()
			attest([T(data) === data, data.k]).equals([true, "x"])
		})

		it("write a default of undefined", async () => {
			const { T } = await load(
				{ T: type({ k: "unknown = undefined" }) },
				{ optimize: "size" }
			)
			attest("k" in (T({}) as object)).equals(true)
		})
	})

	it("literals reading as the code around them", async () => {
		const Gated = type({ b: "string > 3" })
		// a leaf's Apply is named for its content, so a key can name it
		const apply = /\._in\((\w+Apply), data, "b"/.exec(
			precompileStandalone({ Gated }).code
		)![1]
		const gate = `, xR1)!ctx._in(${apply}, data, `
		const types = {
			Keyed: type({
				"ctx._at(": "string",
				"ctx._in(": "string > 1"
			}),
			Units: type("'ctx._in(' | 'ctx._at(' | number"),
			Unit: type("'ctx.x'"),
			Read: type({ "ctx.": "'ctx.'" }),
			Gated: Gated.and({ [`${gate}?`]: "number" }),
			Cases: type.enumerated('case "a": return true', "a: return b", "\\"),
			// the cases of a switch over data's domain, but as strings
			Domains: type("'string' | 'number' | 'object'"),
			Dispatched: type({ k: "'case \"string\":'" })
				.or({ k: "'b: return true '" })
				.or("string"),
			Looped: type({
				"for (;;) {": type.enumerated("${", "`", '"', "\\\\"),
				"         break": "string.url",
				"const errorCount = ctx.currentErrorCount\n": "number",
				"    return false  }": "string"
			})
		}
		const looped = (
			first: string,
			url: string,
			key = "\u2028        break"
		) => ({
			"for (;;) {": first,
			[key]: url,
			"const errorCount = ctx.currentErrorCount\n": 0,
			"    return false\u2028 }": ""
		})
		// each input fails with at most one issue, so a first-issue build keeps
		// arktype's, and an errors "none" build only fails where it does
		const inputsByGroup: [names: (keyof typeof types)[], inputs: unknown[]][] =
			[
				[
					["Keyed", "Units"],
					[
						{ "ctx._at(": "a", "ctx._in(": "ab" },
						{ "runtime.failsAt(ctx, ": "a", "ctx._in(": "ab" },
						{ "ctx._at(": "a", "runtime.failsIn(ctx, ": "ab" },
						"ctx._in(",
						"runtime.failsIn(ctx, ",
						0
					]
				],
				[
					["Unit", "Read"],
					["ctx.x", "ctx.y", { "ctx.": "ctx." }, { "ctx.": "ctx" }]
				],
				[
					["Gated"],
					[
						{ b: "abcd", [gate]: 0 },
						{ b: "abcd", [gate]: "0" },
						{ b: "abc", [gate]: 0 }
					]
				],
				[
					["Cases", "Domains", "Dispatched"],
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
				],
				[
					["Looped"],
					[
						looped("${", "https://arktype.io"),
						looped("\\", "https://arktype.io"),
						looped("`", "arktype"),
						looped('"', "https://arktype.io", "\u2028        return false")
					]
				]
			]
		for (const opts of [
			{},
			{ optimize: "size" },
			{ errors: "first" },
			{ errors: "none" },
			{ mutatesInput: true }
		] satisfies StandaloneOptions[]) {
			const validators = await load(types, opts)
			for (const [names, inputs] of inputsByGroup) {
				for (const name of names) {
					const t: type.Any = types[name]
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
		const { T, U, runtime } = await load(
			{ T: type({ a: "string", b: { c: "number > 0" } }), U: type("string") },
			{ configure: exportsRuntime }
		)
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
		// a failure's class is type.errors, read or unread
		attest(T({}).constructor).is(runtime.type.errors)
		attest(U(5) instanceof runtime.ArkErrors).equals(true)
	})

	it("Standard Schema issues leave their path to the consumer", async () => {
		const issuesOf = async (options: LoadOptions) => {
			const { T } = await load(
				{ T: type({ a: "string", b: { c: "number > 0" } }) },
				options
			)
			const result = T["~standard"].validate({ b: { c: 0 } }) as {
				issues: { path: PropertyKey[]; message: string }[]
			}
			return result.issues.map(issue => [issue.path, issue.message])
		}
		const expected = await issuesOf({})
		attest(expected).snap([
			[["a"], "is missing"],
			[["b", "c"], "must be positive"]
		])
		// a build writing a create of its own
		attest(await issuesOf({ freeze: false })).equals(expected)
		// errors written for size
		attest(
			await issuesOf({ optimize: "size", issues: "issuesLean.ts" })
		).equals(expected)
	})

	it("rejects an object only inheriting Date.prototype", async () => {
		const { D, Bounded, Unit } = await load({
			D: type("Date"),
			Bounded: type("Date > d'2020-01-01'"),
			Unit: type("d'2020-01-01'")
		})
		const impostor = Object.create(Date.prototype)
		attest(String(D(impostor))).snap("must be a Date")
		attest(Bounded.allows(impostor)).equals(false)
		attest(String(Unit(impostor))).snap("must be 2020-01-01")
	})

	it("finds issues as it reads them, unless it validated eagerly", async () => {
		const always = standIn(() => true, "always")
		const T = type({ a: "string", b: "number" })
		const { Lazy } = await load({ Lazy: T })
		const { Sized } = await load({ Sized: T }, { optimize: "size" })
		const Narrowed = (
			await loadFactory(T.narrow(always), [["function", "always", always]])
		)(always)
		const { Valid } = await load({ Valid: type({ a: "string" }) })
		const readAfterWrites = (
			validate: (data: unknown) => any,
			writes: Record<string, unknown>[]
		) => {
			const data: Record<string, unknown> = { a: 0, b: 0 }
			const errors = validate(data)
			return writes.map(write => (Object.assign(data, write), errors.summary))
		}
		attest({
			// found once read, then kept
			lazy: readAfterWrites(Lazy, [{ a: "a", b: "b" }, { b: 0 }]),
			// found as it validates, for size or where it calls a narrow
			sized: readAfterWrites(Sized, [{ a: "a" }]),
			narrowed: readAfterWrites(Narrowed, [{ a: "a" }]),
			// data made valid before its issues are read
			valid: readAfterWrites(Valid, [{ a: "a" }])
		}).snap({
			lazy: ["b must be a number", "b must be a number"],
			sized: ["a must be a string"],
			narrowed: ["a must be a string"],
			valid: ["is invalid"]
		})
	})

	it("firstIssue finds only the first of issues it hasn't read", async () => {
		const T = type({ a: "string", b: "number" })
		const { Lazy, Items, runtime } = await load(
			{ Lazy: T, Items: T.array() },
			{ configure: exportsRuntime }
		)
		let reads = 0
		const counted = () => ({
			a: 0,
			get b() {
				reads++
				return "b"
			}
		})
		// how often b is read as errors are
		const readsOf = (read: () => unknown) => {
			const before = reads
			read()
			return reads - before
		}
		const errors = Lazy(counted())
		const items = Items([{ a: "a", b: 0 }, counted(), counted()])
		attest({
			// stops at a, then the rest are found once read
			reads: [
				readsOf(() => runtime.firstIssue(errors)),
				readsOf(() => errors.summary)
			],
			// stops in the first element rejected
			itemReads: [
				readsOf(() => runtime.firstIssue(items)),
				readsOf(() => items.summary)
			],
			firstItem: runtime.firstIssue(items).message
		}).snap({
			reads: [0, 2],
			itemReads: [2, 8],
			firstItem: "[1].a must be a string"
		})
		const first = runtime.firstIssue(errors)
		attest(first).snap({
			code: "domain",
			path: ["a"],
			data: 0,
			expected: "a string",
			message: "a must be a string"
		})
		attest(errors.issues[0]).equals(first)
		// kept, as issues are once read
		attest(runtime.firstIssue(errors)).is(first)
	})

	it("errors written for size", async () => {
		const T = type({ a: "string", b: { c: "number[]" } })
		const outputs = await Promise.all(
			(
				[
					[{}, "issuesLean.ts"],
					[{ errors: "none" }, "issuesNoneLean.ts"]
				] as const
			).map(async ([opts, issues]) => {
				const { T: validator, runtime } = await load(
					{ T },
					{ ...opts, optimize: "size", issues, configure: exportsRuntime }
				)
				const out = validator({ b: { c: [1, "x"] } })
				const thrown = [() => validator.assert({}), () => out.throw()].map(
					fail => {
						const e = caught(fail)
						return `${e} ${e instanceof runtime.TraversalError}`
					}
				)
				return [
					`${out.constructor === runtime.type.errors} ${out.count} ${JSON.stringify(out.issues)}`,
					out.summary,
					`${String(out) === out.summary} ${`${out}` === out.summary} ${JSON.stringify(out) === JSON.stringify(out.issues)}`,
					...thrown,
					""
				].join("\n")
			})
		)
		attest(outputs).snap([
			`true 2 [{"code":"required","path":["a"],"data":{"b":{"c":[1,"x"]}},"message":"a is missing"},{"code":"domain","path":["b","c",1],"data":"x","expected":"a number","message":"b.c[1] must be a number"}]
a is missing
b.c[1] must be a number
true true true
TraversalError: a is missing
b is missing true
TraversalError: a is missing
b.c[1] must be a number true
`,
			`true 1 [{"code":"predicate","path":[],"data":{"b":{"c":[1,"x"]}},"message":"is invalid"}]
is invalid
true true true
Error: is invalid false
TypeError: out.throw is not a function false
`
		])
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

	it("issues of keywords and of keys sharing a path", async () => {
		const { Keywords, Keys } = await load({
			// stops at its first failing keyword check
			Keywords: type("string.url & string.date"),
			// issues at one path stay apart
			Keys: type({ "[/^a/]": "string[] >= 2", "[/a$/]": "unknown[] <= 0" })
		})
		attest([
			Keywords("nope").summary,
			Keywords("http://example.com").summary,
			Keys({ a: ["q"] }).summary
		]).snap([
			"must be a URL string",
			"must be a parsable date",
			"a must be at least length 2\na must be exactly length 0"
		])
	})

	it("root array issues from its first rejected element", async () => {
		const Objects = type({ x: "number" }).array()
		const { Objects: all } = await load({ Objects })
		const { Objects: first } = await load({ Objects }, { errors: "first" })
		const data = [{ x: 0 }, { x: "a" }, { x: 1 }, {}]
		const piped = type("unknown").pipe((data, ctx) => all(data, ctx))
		attest([
			all(data).summary,
			first(data).summary,
			all({}).summary,
			String(piped(data))
		]).snap([
			"[1].x must be a number\n[3].x is missing",
			"[1].x must be a number",
			"must be an array",
			"value at [1].x must be a number\nvalue at [3].x is missing"
		])
	})

	it("root array read as it validates", async () => {
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
		// elements before the first rejected are read once
		let reads = 0
		const counted: unknown[] = [undefined, { x: "a" }]
		Object.defineProperty(counted, 0, { get: () => (reads++, { x: 0 }) })
		attest(T(counted).summary).snap("[1].x must be a number")
		attest(reads).equals(1)
		// an element a getter replaced is checked as it is then
		const replacing: unknown[] = [undefined, { x: 0 }, { x: 1 }]
		Object.defineProperty(replacing, 0, {
			get: () => ((replacing[2] = { x: "c" }), { x: 0 }),
			enumerable: true
		})
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

	it("errors: none, piped into with or without assert", async () => {
		let User: (data: unknown, ctx: Traversal) => unknown = () => {}
		const validate = standIn(
			(data: unknown, ctx: Traversal) => User(data, ctx),
			"validate"
		)
		for (const members of [{}, { assert: false }]) {
			const created = await load(
				{
					User: type({ name: "string" }),
					Parsed: {
						type: type("string.json.parse").pipe(validate),
						params: [{ kind: "function", label: "`validate`", value: validate }]
					}
				},
				{ errors: "none", configured: false, members }
			)
			User = created.User
			attest(
				created
					.Parsed(validate)('{"name":5}')
					.issues.map((issue: any) => [issue.code, ...issue.path])
			).equals([["predicate"]])
		}
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
				{
					configured: configuredBy(fingerprint),
					members
				}
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
		const {
			T: validator,
			Id,
			Described
		} = await load({
			T,
			Id: type("string.uuid"),
			Described: type("string.uuid").describe("an id")
		})
		attest(validator.expression).equals(T.expression)
		attest(validator.description).equals("a person")
		attest(validator.meta).equals({ description: "a person" })
		attest(String(validator)).equals("Type<{ age: number, name: string }>")
		attest(validator.from({ name: "n", age: 1 })).equals({ name: "n", age: 1 })
		attest(() => validator.assert({})).throws
			.snap(`TraversalError: name is missing
age is missing`)
		attest(validator["~standard"].validate({ name: "n", age: 1 })).equals({
			value: { name: "n", age: 1 }
		})
		attest("jsonSchema" in validator["~standard"]).equals(false)
		// configured meta only, not a keyword's
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
		// one of the issues a build with all its errors reports
		const Listed = type({ a: "string[]", b: "number" })
		const [all, first] = await Promise.all(
			(["all", "first"] as const).map(async errors =>
				(await load({ Listed }, { errors })).Listed({ a: [1], b: "2" })
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
		for (const optimize of ["speed", "size"] as const) {
			const validators = await load(exports, {
				errors: "none",
				optimize,
				configure: exportsRuntime
			})
			for (const [name, [valid, invalid]] of Object.entries(inputs)) {
				attest(validators[name](valid)).equals(
					exports[name as keyof typeof exports](valid)
				)
				// its issue is found once read
				const errors = validators[name](invalid)
				attest(errors.constructor).is(validators.runtime.type.errors)
				attest(errors.issues).equals([
					{ code: "predicate", path: [], data: invalid, message: "is invalid" }
				])
				attest(errors.issues[0].data).is(invalid)
			}
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
		attest(validator.toJSON()).is(validator.json)
		attest(JSON.stringify(validator)).equals(JSON.stringify(T))
		// a new schema each call, as arktype writes one
		attest(validator.toJsonSchema() === validator.toJsonSchema()).equals(false)
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

	it("bakes only listed introspection, for targets it was built with", async () => {
		const T = type({ a: "string" })
		const { T: validator } = await load(
			{ T },
			{ members: { toJsonSchema: true } }
		)
		attest(validator.toJsonSchema({ target: "draft-2020-12" })).equals(
			T.toJsonSchema({ target: "draft-2020-12" })
		)
		attest(() => validator.toJsonSchema({ target: "draft-07" })).throws(
			'a standalone validator\'s JSON Schema takes only a target it was built with, and a fallback only where its schema needs none; configure({ toJsonSchema }) or build with runtime: "arktype"'
		)
		attest([
			validator.json,
			validator.description,
			validator.expression,
			validator.toJSON
		]).equals([undefined, undefined, undefined, undefined])
		attest(JSON.stringify({ validator })).equals("{}")
		attest("jsonSchema" in validator["~standard"]).equals(false)
	})

	it("ignores a fallback a call passes where no fallback writes the schema", async () => {
		const T = type({ name: "string", "tags?": "string[]" })
		const D = type({ at: "Date" })
		const { T: t, D: d } = await load(
			{ T, D },
			{ members: { toJsonSchema: true } }
		)
		// as hono-openapi and @orpc/arktype pass their own
		const fallback = {
			date: (ctx: { base: object }) => ({ ...ctx.base, format: "date-time" })
		}
		const keepBase: ToJsonSchema.UniversalFallback = ctx => ctx.base
		attest(t.toJsonSchema({ fallback: keepBase })).equals(
			T.toJsonSchema({ fallback: keepBase })
		)
		attest(t.toJsonSchema({ target: "draft-2020-12", fallback })).equals(
			T.toJsonSchema({ target: "draft-2020-12", fallback })
		)
		attest(() => d.toJsonSchema({ fallback })).throws(
			bakedJsonSchemaOptionsMessage
		)
		attest(() => t.toJsonSchema({ fallback, useRefs: true })).throws(
			bakedJsonSchemaOptionsMessage
		)
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

	it("Dates and RegExps in meta, held as arktype holds them", async () => {
		const held = /a/g
		held.lastIndex = 2
		const { A, B, C, U } = await load(
			{
				A: type("string").configure({
					examples: [/a/g, new Date(0)]
				} as never),
				B: type("string").configure({
					examples: [/a/g, new Date(0)]
				} as never),
				C: type("string").configure({ examples: [held] } as never),
				U: type("d'1970-01-01'")
			},
			{ members: { toJsonSchema: true } }
		)
		const [regex, date] = A.meta.examples
		const [otherRegex, otherDate] = B.meta.examples
		regex.exec("aaa")
		Date.prototype.setTime.call(date, 1)
		// each stays apart
		attest([
			otherRegex.lastIndex,
			otherDate.getTime(),
			caught(() => U.toJsonSchema()).context.unit.getTime()
		]).equals([0, 0, 0])
		attest([Object.isFrozen(date), Object.getOwnPropertyNames(date)]).equals([
			false,
			[]
		])
		attest(C.meta.examples[0].lastIndex).equals(2)
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

	it("configured writers", async () => {
		const message = standIn(
			(ctx: MessageContext) =>
				`${ctx.propString}: ${ctx.actual} isn't ${ctx.expected}`,
			"message"
		)
		const problem = standIn(
			(ctx: ProblemContext) => `is ${ctx.actual}, not ${ctx.expected}`,
			"problem"
		)
		const actual = standIn((data: unknown) => typeof data, "actual")
		const expected = standIn(
			(ctx: ExpectedContext) => `${ctx.description}, as written`,
			"expected"
		)
		const T = type({
			a: type("string > 1").configure({ message }),
			b: type("number").configure({ problem }),
			c: type("number").configure({ actual }),
			d: type("number").configure({ expected })
		})
		const create = await loadFactory(T, [
			["function", "`message`", message],
			["function", "`problem`", problem],
			["function", "`actual`", actual],
			["function", "`expected`", expected]
		])
		const input = { a: "x", b: "x", c: "y", d: "z" }
		const errors = create(message, problem, actual, expected)(input)
		attest(errors.issues[0].message).equals(
			(T(input) as type.errors).issues[0].message
		)
		attest(errors.issues).snap([
			{
				code: "minLength",
				path: ["a"],
				data: "x",
				expected: "at least length 2",
				message: "a: 1 isn't at least length 2"
			},
			{
				code: "domain",
				path: ["b"],
				data: "x",
				expected: "a number",
				message: "b is a string, not a number",
				problem: "is a string, not a number"
			},
			{
				code: "domain",
				path: ["c"],
				data: "y",
				expected: "a number",
				message: "c must be a number (was string)",
				problem: "must be a number (was string)"
			},
			{
				code: "domain",
				path: ["d"],
				data: "z",
				expected: "a number, as written",
				message: "d must be a number, as written"
			}
		])
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

	it("configured text", async () => {
		const lib = scope(
			{ y: { v: "number" } },
			{ domain: { description: () => "a custom number" } }
		).export()
		const types = {
			Login: type({
				email: type("string.email").configure({ message: "Enter your email." }),
				password: "string >= 8"
			}).configure({ message: "Enter your login." }),
			Piped: type("string.numeric.parse")
				.to("number < 3")
				.configure({ message: "Enter a number below 3." }),
			Problem: type({
				a: type("string").configure({ problem: "is no string" })
			}),
			Indexed: type(
				type("string").configure({ problem: "is no string" }),
				"[]"
			),
			Actual: type({ a: type("string").configure({ actual: "not text" }) }),
			Missing: type({ a: "string" }).configure(
				{ message: "a is required" },
				"required"
			),
			Indiscriminable: type({ a: "string" })
				.or({ b: "number" })
				.configure({ message: "neither" }),
			Discriminated: type({ k: "'a'", a: "string" })
				.or({ k: "'b'", b: "number" })
				.configure({ message: "unknown kind" }),
			Keyed: type({
				a: type("string | number").configure({ message: "no a" })
			}),
			Undeclared: type({ "+": "reject", a: "string" }).configure(
				{ message: "no extra keys" },
				"structure"
			),
			Intersected: scope(
				{},
				{ intersection: { message: () => "configured" } }
			).type("string >= 5 & /^a/"),
			// another scope's descriptions, before and after the build's own
			OwnFirst: type({ a: { v: "number" } }),
			KeptAfter: type({ a: lib.y }),
			KeptFirst: type({ b: lib.y }),
			OwnAfter: type({ b: { v: "number" } })
		}
		const validators = await load(types)
		const described = { a: { v: "s" }, b: { v: "s" } }
		attest(
			textOf(validators, [
				["Login", { email: "x", password: "" }],
				["Login", null],
				["Piped", "5"],
				["Problem", { a: 1 }],
				["Indexed", [1]],
				["Actual", { a: 1 }],
				["Missing", {}],
				["Missing", { a: 1 }],
				["Indiscriminable", {}],
				["Discriminated", { k: "c" }],
				["Keyed", { a: true }],
				["Undeclared", { a: "", b: 1 }],
				["Intersected", "b"],
				["OwnFirst", described],
				["KeptAfter", described],
				["KeptFirst", described],
				["OwnAfter", described]
			])
		).snap([
			"Enter your email.\npassword must be at least length 8",
			"Enter your login.",
			"Enter a number below 3.",
			"a is no string",
			"[0] is no string",
			"a must be a string (was not text)",
			"a is required",
			"a must be a string",
			"neither",
			"unknown kind",
			"no a",
			"no extra keys",
			"must be matched by ^a\nmust be at least length 5",
			"a.v must be a number",
			"a.v must be a custom number",
			"b.v must be a custom number",
			"b.v must be a number"
		])
		attest(String(validators.Piped("5"))).equals(String(types.Piped("5")))
		attest(validators.Problem({ a: 1 }).issues[0]).snap({
			code: "domain",
			path: ["a"],
			data: 1,
			expected: "a string",
			message: "a is no string",
			problem: "is no string"
		})
	})

	it("an undeclared key's issue as arktype writes it", async () => {
		const types = {
			Strict: type({ "+": "reject", a: "string", o: { "+": "reject" } }),
			Gone: type({ "+": "reject" }).configure({ expected: "gone" }, "structure")
		}
		const issuesOf = ({ Strict, Gone }: Record<string, any>) =>
			[Strict({ a: "", o: { b: 1 }, c: 1 }), Gone({ d: 1 })].flatMap(out =>
				out.issues.map(({ code, path, expected, message }: any) =>
					JSON.stringify({ code, path, expected, message })
				)
			)
		const arktype = issuesOf(types)
		attest(arktype).snap([
			'{"code":"undeclared","path":["o","b"],"expected":"removed","message":"o.b must be removed"}',
			'{"code":"undeclared","path":["c"],"expected":"removed","message":"c must be removed"}',
			'{"code":"undeclared","path":["d"],"expected":"gone","message":"d must be gone"}'
		])
		attest(issuesOf(await load(types))).equals(arktype)
		attest(
			issuesOf(await load(types, { optimize: "size", issues: "issuesLean.ts" }))
		).equals(arktype)
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

	it("refuses what it can't precompile", () => {
		// what it can't precompile, as writeUnprecompilableMessage names it
		const refusalOf = (exports: Record<string, StandaloneExport>) =>
			caught(() => precompileStandalone(exports)).message.replace(
				writeUnprecompilableMessage(""),
				""
			)
		const configured = (value: unknown) =>
			refusalOf({ T: type("string").configure({ value } as never) })
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		const write = standIn(() => "written", "write")
		const named = <fn extends Function>(n: string, fn: fn, id: string) =>
			standIn(fn, id, n)
		const isEven = named("isEven", (n: number) => n % 2 === 0, "a")
		const isSmall = named("isSmall", (n: number) => n < 10, "b")
		const arityIsSmall = named("isSmall", (n: number) => n < 10, "a")
		const isPositive = named("isPositive", (n: number) => n > 0, "c")
		const ctxIsEven = named(
			"isEven",
			(n: number, ctx: { mustBe: (s: string) => false }) =>
				n % 2 === 0 || ctx.mustBe("even"),
			"b"
		)
		const isLong = named("isLong", (s: string) => s.length > 10, "a")
		const unnamedEven = standIn((n: number) => n % 2 === 0, "iseven")
		const unnamedPositive = standIn((n: number) => n > 0, "ispositive")
		const holes = (...fns: [label: string, fn: Function][]) =>
			fns.map(([label, value]) => ({
				kind: "function" as const,
				label: `\`${label}\``,
				value
			}))
		const and = (n: number) => n > 0
		const isEvenFn = (n: number) => n % 2 === 0
		attest({
			function: refusalOf({ T: type("number").narrow(isEvenFn) }),
			unit: refusalOf({ T: type("===", { a: 1 }) }),
			typeUnit: refusalOf({ T: type.enumerated(type({ a: "string" })) }),
			domainMessage: refusalOf({
				T: scope({}, { domain: { message: () => "configured" } }).type("string")
			}),
			stringDomainMessage: refusalOf({
				T: scope(
					{ T: { a: "string" } },
					{ domain: { message: "configured" } }
				).export().T
			}),
			unitExpected: refusalOf({
				S: scope({}, { unit: { expected: "an a" } }).type("'a'")
			}),
			unionMessageForKey: refusalOf({
				T: scope({}, { union: { message: () => "configured" } }).type({
					a: "boolean"
				})
			}),
			unionWriter: refusalOf({
				T: {
					type: type("string | number").configure({ message: write }),
					params: holes(["write", write])
				}
			}),
			cyclic: configured(cyclic),
			accessor: configured({
				get x() {
					return 1
				}
			}),
			map: configured(new Map()),
			hole: configured(new Array(1)),
			extra: configured(Object.assign([1], { x: 1 })),
			hidden: configured(Object.defineProperty({}, "x", { value: 1 })),
			symbol: configured({ [Symbol("x")]: 1 }),
			date: configured(Object.assign(new Date(0), { x: 1 })),
			regex: configured(Object.assign(/x/, { x: 1 })),
			// a function printed in words, unfindable by a factory
			unplaced: refusalOf({
				T: { type: type("number").narrow(and), params: holes(["and", and]) }
			}),
			unreceived: refusalOf({ T: type("string").describe("$hole_other") }),
			// an order that a minifier renaming a hole could change
			nameOrder: refusalOf({
				T: {
					type: type("number")
						.narrow(isSmall)
						.or(type("number").narrow(isEven).narrow(isPositive)),
					params: holes(
						["isSmall", isSmall],
						["isEven", isEven],
						["isPositive", isPositive]
					)
				}
			}),
			arityOrder: refusalOf({
				T: {
					type: type("number")
						.narrow(arityIsSmall)
						.or(type("number").narrow(ctxIsEven)),
					params: holes(["isSmall", arityIsSmall], ["isEven", ctxIsEven])
				}
			}),
			keywordOrder: refusalOf({
				T: {
					type: type
						.schema({
							domain: "string",
							predicate: { predicate: isLong, meta: "long" }
						})
						.or("string.date"),
					params: holes(["isLong", isLong])
				}
			}),
			unnamedOrder: refusalOf({
				T: {
					type: type("number")
						.narrow(unnamedEven)
						.or(type("number").narrow(unnamedPositive)),
					params: holes(
						["isEven", unnamedEven],
						["isPositive", unnamedPositive]
					)
				}
			})
		}).snap({
			function: "Function(isEvenFn)",
			unit: 'the unit {"a":1}',
			typeUnit: "the unit Type<{ a: string }>",
			domainMessage: "a scope's configured domain message",
			stringDomainMessage: "a scope's configured domain message",
			unitExpected: "a scope's configured unit expected",
			unionMessageForKey: "a scope's configured union message",
			unionWriter:
				"`number | string`'s message writer, which reads each branch's errors",
			cyclic: "a cyclic object",
			accessor: 'the accessor "x"',
			map: "an instance of Map",
			hole: "an array with holes or other properties",
			extra: "an array with holes or other properties",
			hidden: 'the non-enumerable property "x"',
			symbol: "the symbol key Symbol(x)",
			date: "a Date with its own properties",
			regex: "a RegExp with its own properties",
			unplaced: "Unexpected function `and` not named by a placeholder",
			unreceived:
				"the name of $hole_other, which the validator doesn't receive",
			nameOrder: "an order that depends on the name of `isEven`",
			arityOrder: "an order that depends on the name of `isEven`",
			keywordOrder: "an order that depends on the name of `isLong`",
			unnamedOrder: "an order that depends on the name of `isEven`"
		})
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

	it("mutatesInput: true writes and returns its input", async () => {
		const exports = {
			User: type({
				name: "string.trim",
				tags: "string.trim[]",
				role: "string = 'user'"
			}),
			Index: type({ "[string]": "string.trim" }),
			Tuple: type(["string.trim", "string = 'x'"]),
			// a scope's mutatesInput, which the build's replaces
			Scoped: scope(
				{ T: { n: "string.numeric.parse" } },
				{ mutatesInput: true }
			).export().T
		}
		const copied = { name: " a ", tags: [" b "] }
		const copying = await load(exports)
		attest(copying.User(copied)).equals({
			name: "a",
			tags: ["b"],
			role: "user"
		})
		attest(copied).equals({ name: " a ", tags: [" b "] })
		const kept = { n: "1" }
		attest(copying.Scoped(kept)).equals({ n: 1 })
		attest(kept).equals({ n: "1" })
		const mutating = await load(exports, { mutatesInput: true })
		const tags = [" b "]
		const inputs: Record<string, any> = {
			User: { name: " a ", tags },
			Index: { k: " b " },
			Tuple: [" c "],
			Scoped: { n: "1" }
		}
		attest(
			Object.entries(inputs).map(
				([name, input]) => mutating[name](input) === input
			)
		).equals([true, true, true, true])
		attest(inputs).equals({
			User: { name: "a", tags: ["b"], role: "user" },
			Index: { k: "b" },
			Tuple: ["c", "x"],
			Scoped: { n: 1 }
		})
		attest(inputs.User.tags).is(tags)
		attest(() =>
			mutating.User(Object.freeze({ name: " a ", tags: [], role: "admin" }))
		).throws("Cannot assign to read only property 'name'")
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

	it("rejects an undeclared key in place of a declared one held otherwise", async () => {
		const { T, U } = await load({
			T: type({ "+": "reject", a: "string", "b?": "number" }),
			U: type({ "+": "reject", toString: "Function" })
		})
		const nonEnumerable = Object.defineProperty({ c: 1 }, "a", { value: "" })
		attest(T(nonEnumerable).summary).snap("c must be removed")
		attest(U({ c: 1 }).summary).snap("c must be removed")
	})

	describe("jsonInput", () => {
		const Strict = type({ "+": "reject", a: "string", "b?": "number" })

		it("counts a plain object's keys", async () => {
			const { T } = await load({ T: Strict }, { jsonInput: true })
			const absent = { a: "" }
			const present = { a: "", b: 0 }
			attest(T(absent)).is(absent)
			attest(T(present)).is(present)
			attest(T({ a: "", c: 1 }).summary).snap("c must be removed")
			attest(T({ a: "", b: 0, c: 1 }).summary).snap("c must be removed")
		})

		it("passes an undeclared key beside a declared non-enumerable one", async () => {
			const { T } = await load({ T: Strict }, { jsonInput: true })
			const nonEnumerable = Object.defineProperty({ c: 1 }, "a", { value: "" })
			attest(T(nonEnumerable)).is(nonEnumerable)
		})

		it("checks each key where in finds one Object.prototype has", async () => {
			const { U } = await load(
				{ U: type({ "+": "reject", toString: "Function" }) },
				{ jsonInput: true }
			)
			attest(U({ c: 1 }).summary).snap("c must be removed")
		})

		it("checks each key of an object whose prototype isn't Object.prototype", async () => {
			const { T } = await load({ T: Strict }, { jsonInput: true })
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
			writeCreatedBeforeConfigureMessage("main.ts", "./config.ts")
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
		// a second configure() after the first, or after the build's own
		const nan = fingerprintOf({ numberAllowsNaN: true })
		const configured = `runtime.configure({ numberAllowsNaN: true }, "${nan}")`
		attest([
			await messageOf(
				`runtime.configure({ onUndeclaredKey: "delete" })\n${configured}`,
				nan
			),
			await messageOf(`${configured}\n${configured}`, nan)
		]).equals([reconfiguredMessage, reconfiguredMessage])
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
						configured: configuredBy(
							fingerprintOf({ onUndeclaredKey: "delete" })
						)
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

	it("creates validators lazily", async () => {
		const config = { onFail: () => "configured" }
		const artifact = await importCode(
			bundle(
				`${
					precompileStandalone(
						{ T: type({ a: "string" }) },
						{
							configured: configuredBy(fingerprintOf(config))
						}
					).code
				}\nexport const configure = runtime.configure`
			).js
		)
		artifact.configure(config, fingerprintOf(config))
		attest(artifact.T()({ a: 1 })).equals("configured")
		attest(artifact.T()).is(artifact.T())
		attest(() => artifact.configure(config)).throws(reconfiguredMessage)
		// unless built with lazy: false
		attest(
			await importCode(
				bundle(
					precompileStandalone(
						{ T: type("string") },
						{
							configured: configuredBy(fingerprintOf({})),
							lazy: false
						}
					).code
				).js
			).then(
				() => "",
				(e: Error) => e.message
			)
		).equals(writeCreatedBeforeConfigureMessage("main.ts", "./config.ts"))
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
								configured: configuredBy(fingerprintOf({}))
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

	it("module exports", async () => {
		const M = scope({
			a: "string",
			b: { a: "a" },
			sub: scope({ c: "number" }).export()
		}).export()
		const validators = await load({ M, a: M.a, "😀": M.a })
		attest(Object.keys(validators.M)).equals(Object.keys(M))
		attest(validators.M.a).equals(validators.a)
		attest(validators["😀"]).equals(validators.a)
		attest(observe(validators.M.b({ a: 1 }), undefined)).equals(
			observe(M.b({ a: 1 }), undefined)
		)
		attest(validators.M.sub.c("x").summary).snap("must be a number")
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

	it("errors in en, beside a runtime island in any locale", async () => {
		const { js } = bundle(`${precompileStandalone({ T: type("string") }).code}
import "arktype/internal/island.js"
import { type } from "arktype"
export { messageIn } from "arktype"
export { de } from "arktype/locales/de"
export const Island = type("string")
export const Validating = type(["unknown", "unknown"]).pipe(([d, validate]) => validate(d))`)
		const artifact = await importCode(js)
		const errors = artifact.T()(1)
		const validated = artifact.Validating([1, artifact.T()])
		attest([
			errors.summary,
			errors.toLocaleString(artifact.de),
			artifact.Island(1).toLocaleString(artifact.de),
			validated.toLocaleString(artifact.de),
			artifact.messageIn(validated.issues[0], artifact.de)
		]).snap([
			"must be a string",
			"must be a string",
			"muss eine Zeichenkette sein, ist aber eine Zahl",
			"must be a string",
			"must be a string"
		])
		// and without one
		const { T } = await load({ T: type("string") })
		attest(T(1).toLocaleString(de)).equals(T(1).summary)
	})

	describe("factories", () => {
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
			const otherType = writeCreationMismatchMessage(
				"`Name`",
				"another Type",
				"the Type it was at build"
			)
			attest(() => create(validators.Text)).throws(otherType)
			attest(() => create(validators.Described(trim))).throws(otherType)
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
			attest(() => unlisted.User(unlisted.Text)).throws(otherType)
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
					.map(factory => /\(created\d+ === undefined \? /.test(factory))
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
			const now = standIn(() => new Date(0), "now")
			const create = await loadFactory(
				type({ at: ["Date", "=", now], n: "number = 1" }),
				[["function", "`now`", now]]
			)
			attest(create(() => new Date(1))({})).equals({
				at: new Date(1),
				n: 1
			})
			const { Empty } = await load({ Empty: type({ values: "string[] = []" }) })
			attest(Empty({}).values !== Empty({}).values).equals(true)
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
			const exports = {
				T: {
					type: T,
					params: [{ kind: "function", label: "`isEven`", value: isEven }],
					defaultChecks: [[optional.value, 3, "a"]]
				}
			} satisfies Record<string, StandaloneExport>
			const { T: create } = await load(exports)
			const { T: undetailed } = await load(exports, { errors: "none" })
			const isEvenNamed = function isEven(n: number) {
				return n % 2 === 0
			}
			attest(create((n: number) => n > 0)({})).equals({ a: 3 })
			attest(() => create(isEvenNamed)).throws.snap(
				"ParseError: Default for a must be valid according to isEven"
			)
			attest(() => undetailed(isEvenNamed)).throws.snap(
				"ParseError: Default for a is invalid"
			)
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

		it("creates anew each call, unless interned", async () => {
			const isLong = standIn((s: string) => s.length > 1, "long")
			const T = type("string").narrow(isLong)
			const params = [
				{ kind: "function" as const, label: "`isLong`", value: isLong }
			]
			const created = await load({
				M: { type: scope({ a: "string", b: { a: "a" } }).export(), params: [] },
				S: { type: scope({ a: "string" }), params: [] },
				G: { type: type("<t>", { box: "t" }), params: [] },
				A: { type: T, params, internedBy: 0 },
				B: { type: T, params, internedBy: 0 },
				C: { type: T, params }
			})
			const [m1, m2] = [created.M(), created.M()]
			attest([m1 === m2, m1.a === m2.a, m1.b({ a: "x" })]).equals([
				false,
				false,
				{ a: "x" }
			])
			attest(created.S() === created.S()).equals(false)
			attest(created.G() === created.G()).equals(false)
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
			"type/checkers.ts",
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
