import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	isNode,
	precompileRootUnits,
	registeredReference,
	rootSchema,
	schemaScope,
	writePrecompiledUnits,
	type BaseNode,
	type BaseScope
} from "@ark/schema"
import { flatMorph, liftArray } from "@ark/util"
import { keywords, scope, type } from "arktype"
import * as keywordFunctions from "arktype/internal/keywords/functions.ts"
import {
	precompileStandalone,
	runtimeKeyOf
} from "arktype/internal/standalone.ts"
import {
	corpus,
	isPrecompiled,
	observe,
	precompile as precompileUnits
} from "./integration/precompiled.ts"

contextualize(() => {
	const isEven = (n: number) => n % 2 === 0

	const named = <f extends Function>(name: string, f: f): f =>
		Object.defineProperty(f, "name", { value: name })

	const define = () =>
		scope({
			user: { name: "string", age: "number.integer >= 0" },
			even: ["number", ":", isEven],
			tree: { value: "number", "children?": "tree[]" },
			a: { n: "string.numeric.parse", "b?": "b" },
			b: { "a?": "a" }
		}).export()

	const emit = () => {
		const types = define()
		const roots = Object.values(types).map(t => t.internal)
		return {
			names: precompileRootUnits(types.user.internal)[0].names,
			units: writePrecompiledUnits(roots),
			artifact: precompileStandalone({ user: types.user, tree: types.tree })
		}
	}

	it("names a unit by its content", () => {
		const first = emit()
		for (let i = 0; i < 40; i++) type({ [`k${i}`]: `number > ${i}` })
		type("number").narrow(named("isEven", n => n % 2 === 1))
		scope({ user: "string", tree: { "next?": "tree" } }).export()
		const second = emit()
		attest(Object.keys(second.names)[0] === Object.keys(first.names)[0]).equals(
			false
		)
		attest(Object.values(second.names)).equals(Object.values(first.names))
		attest(second.units).equals(first.units)
		attest(second.artifact).equals(first.artifact)
	})

	it("names a node the same whichever roots reach it", () => {
		const Email = type("string.email")
		const After = type("Date > d'2000-01-01'")
		// as a build names them, since a required prop's context holds its value's, which can reach Date before isValidDate
		const namesOf = (...types: type.Any[]) =>
			Object.assign(
				{},
				...types.map(
					t => precompileRootUnits(t.internal, runtimeKeyOf)[0].names
				)
			)
		const alone = { ...namesOf(Email), ...namesOf(After) }
		const reached = namesOf(
			type({ id: "string.uuid", at: "Date > d'1999-01-01'" }),
			Email,
			After
		)
		attest(flatMorph(alone, id => [id, reached[id]])).equals(alone)
	})

	it("names a cyclic unit the same after validating deep data", () => {
		const { tree } = scope({
			tree: { value: "number", "children?": "tree[]" }
		}).export()
		const artifact = precompileStandalone({ tree })
		let data: unknown = { value: 0 }
		for (let i = 0; i < 100; i++) data = { value: i, children: [data] }
		tree(data)
		attest(precompileStandalone({ tree })).equals(artifact)
	})

	it("passes symbols and object units to compiled code", () => {
		const key = Symbol("precompiledKey")
		const Inner = type({ a: "string" })
		const T = type({
			[key]: "'a'",
			unit: type.enumerated(key, Inner),
			defaulted: ["symbol", "=", key]
		}).or({ [key]: "'b'", n: "number" })
		attest(T.precompilation!.includes("$ark")).equals(false)
		attest(T({ [key]: "a", unit: Inner })).equals({
			[key]: "a",
			unit: Inner,
			defaulted: key
		})
		attest(T({ [key]: "c" }).toString()).snap(
			'value at [Symbol(precompiledKey)] must be "b" or "a" (was "c")'
		)
		attest(T({ [key]: "b", n: "x" }).toString()).snap(
			"n must be a number (was a string)"
		)
	})

	it("exports every keyword's predicates and morphs", () => {
		const exported = new Set<unknown>([
			liftArray,
			...Object.values(keywordFunctions),
			...Object.values(keywordFunctions.normalizationsByForm).flatMap(
				normalization => [normalization.predicate, normalization.morphs]
			)
		])
		const unexported: string[] = []
		const collect = (path: string, value: any): void => {
			if (typeof value === "function" && value.internal?.references) {
				for (const node of value.internal.references) {
					const fns =
						node.hasKind("morph") ? node.morphs
						: node.hasKind("predicate") ? [node.predicate]
						: []
					for (const fn of fns)
						if (!isNode(fn) && !exported.has(fn)) unexported.push(path)
				}
			} else if (typeof value === "object" && value !== null)
				for (const k in value) collect(`${path}.${k}`, value[k])
		}
		collect("keywords", keywords)
		attest(unexported).equals([])
	})

	it("names each scope holding a keyword's nodes apart from the others", () => {
		const scopes = new Set<BaseScope>()
		const collect = (value: any): void => {
			if (typeof value === "function" && value.internal?.references) {
				for (const node of [value.internal, ...value.internal.references]) {
					for (let n: BaseNode | undefined = node; n; n = n.boundFrom)
						scopes.add(n.$)
				}
			} else if (typeof value === "object" && value !== null)
				for (const k in value) collect(value[k])
		}
		collect(keywords)
		collect($ark.intrinsic)
		const names = [...scopes].map($ => $.isBuiltin && $.name)
		attest(new Set(names).size).equals(scopes.size)
		attest(names.sort()).snap([
			"Array",
			"FormData",
			"TypedArray",
			"ark",
			"intrinsic",
			"intrinsic.json",
			"intrinsic.roots",
			"number",
			"object",
			"object.json",
			"schema",
			"string",
			"string.base64",
			"string.capitalize",
			"string.date",
			"string.date.epoch",
			"string.date.iso",
			"string.integer",
			"string.ip",
			"string.json",
			"string.lower",
			"string.normalize",
			"string.normalize.NFC",
			"string.normalize.NFD",
			"string.normalize.NFKC",
			"string.normalize.NFKD",
			"string.numeric",
			"string.trim",
			"string.upper",
			"string.url",
			"string.uuid",
			"unknown"
		])
	})

	it("binds a precompiled unit with the JIT's results", async () => {
		const jit = corpus.map(([def]) => scope({}).type(def as never))
		const units = await precompileUnits(jit)
		for (let i = 0; i < corpus.length; i++) {
			const T = scope({}).type(corpus[i][0] as never)
			attest(isPrecompiled(units, T.internal)).equals(true)
			const jitInputs = corpus[i][1]()
			for (const [j, data] of corpus[i][1]().entries())
				attest(observe(T, data)).equals(observe(jit[i], jitInputs[j]))
		}
	})

	it("reads descriptions from the nodes it binds", async () => {
		const def = { precompiledDescribed: "string" } as const
		const config = { domain: { description: () => "a custom domain" } }
		const Jit = scope({}, config).type(def)
		const units = await precompileUnits([scope({}).type(def)])
		const T = scope({}, config).type(def)
		attest(isPrecompiled(units, T.internal)).equals(true)
		attest(T({ precompiledDescribed: 5 }).toString()).snap(
			"precompiledDescribed must be a custom domain (was a number)"
		)
		attest(observe(T, 5)).equals(observe(Jit, 5))
	})

	it("misses a changed definition", async () => {
		const units = await precompileUnits([
			scope({}).type({ "precompiledOptional?": "string" })
		])
		const Changed = scope({}).type({ "precompiledOptional?": "number" })
		const Undefinable = scope({}, { exactOptionalPropertyTypes: false }).type({
			"precompiledOptional?": "string"
		})
		attest(isPrecompiled(units, Changed.internal)).equals(false)
		attest(Changed({ precompiledOptional: "x" }).toString()).snap(
			"precompiledOptional must be a number (was a string)"
		)
		attest(isPrecompiled(units, Undefinable.internal)).equals(false)
		attest(Undefinable.allows({ precompiledOptional: undefined })).equals(true)
	})

	it("binds a unit for a function registered under a counted name", async () => {
		const units = await precompileUnits([
			type("number").narrow(named("isSignedPrecompiled", n => n > 0))
		])
		const isNegative = named("isSignedPrecompiled", (n: number) => n < 0)
		const T = type("number").narrow(isNegative)
		attest(registeredReference(isNegative)).satisfies(
			/^\$ark\.isSignedPrecompiled\$\d+$/
		)
		attest(isPrecompiled(units, T.internal)).equals(true)
		attest(T(-1)).equals(-1)
		attest(T(1).toString()).snap(
			"must be valid according to isSignedPrecompiled (was 1)"
		)
	})

	it("binds a unit for a function a minifier renamed, unless its arity changed", async () => {
		const units = await precompileUnits([
			type("number").narrow(named("isPositivePrecompiled", n => n > 0))
		])
		const T = type("number").narrow(named("a", (n: number) => n > 0))
		const Contextual = type("number").narrow(
			named("a", (n: number, ctx) => n > 0 || ctx.reject("positive"))
		)
		attest(isPrecompiled(units, T.internal)).equals(true)
		attest(T(-1).toString()).snap("must be valid according to a (was -1)")
		attest(isPrecompiled(units, Contextual.internal)).equals(false)
		attest(Contextual(-1).toString()).snap("must be positive (was -1)")
	})

	it("binds a unit by the arity arktype first read, though it changes after", async () => {
		const units = await precompileUnits([
			type([
				"number",
				"=>",
				named("doublePrecompiled", (n: number) => n * 2)
			]).or("string")
		])
		const double = named("doublePrecompiled", (n: number) => n * 2)
		const L = type(["number", "=>", double])
		Object.defineProperty(double, "length", { value: 2 })
		const U = L.or("string")
		attest(isPrecompiled(units, U.internal)).equals(true)
		attest(U(2)).equals(4)
	})

	it("keys a unit without reading the arity of a function arktype doesn't call", async () => {
		await precompileUnits([type({ unrelated: "string" })])
		const count = function (_: unknown) {
			return arguments.length
		}
		type("===", count)
		Object.defineProperty(count, "length", { value: 2 })
		attest(type(["unknown", "=>", count])(0)).equals(2)
	})

	it("misses a unit whose functions are shared differently", async () => {
		const isShared = named("isSharedPrecompiled", (n: number) => n > 0)
		const units = await precompileUnits([
			type({ a: ["number", ":", isShared], b: ["number", ":", isShared] })
		])
		const T = type({
			a: ["number", ":", named("isSharedPrecompiled", (n: number) => n > 0)],
			b: ["number", ":", named("isSharedPrecompiled", (n: number) => n < 0)]
		})
		attest(isPrecompiled(units, T.internal)).equals(false)
		attest(T({ a: 1, b: -1 })).equals({ a: 1, b: -1 })
	})

	it("misses a root whose JSON leaves out a child", async () => {
		const units = await precompileUnits([rootSchema({ required: [] }) as never])
		const T = schemaScope({}).parse({})
		attest(isPrecompiled(units, T)).equals(false)
		attest(T.allows(1)).equals(true)
	})

	it("misses a cyclic type", async () => {
		const def = { precompiledValue: "string", "next?": "this" } as const
		const units = await precompileUnits([scope({}).type(def)])
		attest(units).equals({})
		const T = scope({}).type(def)
		attest(
			T({ precompiledValue: "a", next: { precompiledValue: 1 } }).toString()
		).snap("next.precompiledValue must be a string (was a number)")
	})
})
