import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	isNode,
	precompileRootUnits,
	registeredReference,
	rootSchema,
	schemaScope,
	writePrecompiledUnits,
	type BaseScope
} from "@ark/schema"
import {
	flatMorph,
	isPlainObjectOrArray,
	isValidDate,
	liftArray
} from "@ark/util"
import { keywords, scope, type } from "arktype"
import * as keywordFunctions from "arktype/internal/keywords/functions.ts"
import {
	precompileStandalone,
	runtimeKeyOf
} from "arktype/internal/standalone.ts"
import {
	assertMatchesCorpus,
	corpus,
	isPrecompiled,
	observe,
	precompileUnits
} from "./integration/precompiled.ts"

const eachType = (
	value: any,
	visit: (t: any, path: string) => void,
	path = "keywords"
): void => {
	if (typeof value === "function" && value.internal?.references)
		visit(value, path)
	else if (typeof value === "object" && value !== null)
		for (const k in value) eachType(value[k], visit, `${path}.${k}`)
}

contextualize(() => {
	const isEven = (n: number) => n % 2 === 0

	const named = <f extends Function>(name: string, f: f): f =>
		Object.defineProperty(f, "name", { value: name })

	const define = () =>
		scope({
			user: { name: "string", age: "number.integer >= 0" },
			tree: { value: "number", "children?": "tree[]" },
			a: { n: "string.numeric.parse", "b?": "b" },
			b: { "a?": "a" }
		}).export()

	const emit = () => {
		const types = define()
		// a Scope's Types share its predicate, so export only user and tree
		const even = type(["number", ":", isEven])
		const roots = [...Object.values(types), even].map(t => t.internal)
		return {
			names: precompileRootUnits(types.user.internal)[0].names,
			units: writePrecompiledUnits(roots),
			artifact: precompileStandalone({ user: types.user, tree: types.tree })
				.code
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
		// names as a build would, via runtimeKeyOf
		const namesOf = (...types: type.Any[]) =>
			Object.assign(
				{},
				...types.map(
					t => precompileRootUnits(t.internal, { keyOf: runtimeKeyOf })[0].names
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
		const artifact = precompileStandalone({ tree }).code
		let data: unknown = { value: 0 }
		for (let i = 0; i < 100; i++) data = { value: i, children: [data] }
		tree(data)
		attest(precompileStandalone({ tree }).code).equals(artifact)
	})

	it("writes a global pattern the same after it matches", () => {
		const T = type({ s: /a/g })
		const write = () => [
			writePrecompiledUnits([T.internal]),
			precompileStandalone({ T }).code
		]
		const written = write()
		attest(T({ s: "xa" })).equals({ s: "xa" })
		attest(write()).equals(written)
	})

	it("describes a union missed by a morph's input union as arktype does", () => {
		// the input's cases, where its miss is one error, or its branches'
		// bases where one of them is described
		const Cased = type(["string | number", "=>", String]).or([
			"object",
			"@",
			"a box"
		])
		const Listed = type([
			[["string", "@", "a thing"], "|", "number"],
			"=>",
			String
		]).or("object")
		attest(Cased(null).toString()).snap(
			"must be a box, a number or a string (was null)"
		)
		attest(Listed(null).toString()).snap(
			"must be an object, a number or a thing (was null)"
		)
		const { code } = precompileStandalone({ Cased, Listed })
		attest(code).satisfies(/siteOf\("union", "a box, a number or a string"\)/)
		attest(code).satisfies(
			/siteOf\("union", "an object, a number or a thing"\)/
		)
	})

	it("describes a union's miss by a described morph's description", () => {
		const T = type({ "x?": "string" }).or([
			["5n | -0.5", "=>", String],
			"@",
			"a thing"
		])
		attest(String(T(-0))).snap("must be an object or a thing (was 0)")
		attest(precompileStandalone({ T }).code).satisfies(
			/siteOf\("union", "an object or a thing"\)/
		)
	})

	it("describes a union's miss by a unit branch and the cases before its default", () => {
		// the morph is the discriminant's default case, reported after the
		// cases data missed
		const T = type(["string | number", "=>", String]).or("object").or("null")
		attest(String(T(true))).snap(
			"must be an object, null, a number or a string (was boolean)"
		)
		attest(precompileStandalone({ T }).code).satisfies(
			/siteOf\("union", "an object, null, a number or a string"\)/
		)
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
			isPlainObjectOrArray,
			...Object.values(keywordFunctions),
			...Object.values(keywordFunctions.normalizationsByForm).flatMap(
				normalization => [normalization.predicate, normalization.morphs]
			)
		])
		const unexported: string[] = []
		eachType(keywords, (t, path) => {
			for (const node of t.internal.references) {
				const fns =
					node.is("morph") ? node.morphs
					: node.is("predicate") ? [node.predicate]
					: []
				for (const fn of fns)
					if (!isNode(fn) && !exported.has(fn)) unexported.push(path)
			}
		})
		attest(unexported).equals([])
	})

	it("names each scope holding a keyword's nodes apart from the others", () => {
		const scopes = new Set<BaseScope>()
		const collect = (t: any) => {
			for (const node of [t.internal, ...t.internal.references])
				scopes.add(node.$)
		}
		eachType(keywords, collect)
		eachType($ark.kw, collect)
		const names = [...scopes].map($ => $.isBuiltin && $.name)
		attest(new Set(names).size).equals(scopes.size)
		attest(names.sort()).snap([
			"ark",
			"intrinsic",
			"intrinsic.json",
			"intrinsic.roots",
			"schema",
			"string.integer",
			"string.ip",
			"string.uuid"
		])
	})

	it("binds a precompiled unit with the JIT's results", async () => {
		const jit = corpus.map(([def]) => scope({}).type(def as never))
		assertMatchesCorpus(await precompileUnits(jit), jit)
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

	it("misses a definition declaring its keys in another order", async () => {
		const def = {
			precompiledB: "string",
			precompiledA: "string",
			"+": "delete"
		} as const
		const units = await precompileUnits([scope({}).type(def)])
		const Same = scope({}).type(def)
		const Reordered = scope({}).type({
			precompiledA: "string",
			precompiledB: "string",
			"+": "delete"
		})
		const data = { precompiledA: "a", precompiledB: "b" }
		attest(isPrecompiled(units, Same.internal)).equals(true)
		attest(Object.keys(Same(data))).snap(["precompiledB", "precompiledA"])
		attest(isPrecompiled(units, Reordered.internal)).equals(false)
		attest(Object.keys(Reordered(data))).snap(["precompiledA", "precompiledB"])
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

	it("keys a unit without reading the arity of a function arktype doesn't call", async () => {
		await precompileUnits([type({ unrelated: "string" })])
		const count = function (_: unknown) {
			return arguments.length
		}
		type("===", count)
		Object.defineProperty(count, "length", { value: 2 })
		attest(type(["unknown", "=>", count])(0)).equals(2)
	})

	it("binds a unit for a tuple default a minifier renamed", async () => {
		const units = await precompileUnits([
			type(["string", ["number[]", "=", named("emptyPrecompiled", () => [])]])
		])
		const T = type(["string", ["number[]", "=", named("e", () => [])]])
		attest(isPrecompiled(units, T.internal)).equals(true)
		attest(T(["a"])).equals(["a", []])
	})

	it("binds a unit for an array that holds itself", async () => {
		const a: unknown[] = []
		a.push(a)
		const units = await precompileUnits([scope({}).type({ k: ["===", a] })])
		const T = scope({}).type({ k: ["===", a] })
		attest(isPrecompiled(units, T.internal)).equals(true)
		attest(T.allows({ k: a })).equals(true)
	})

	it("keys a unit without naming the functions in its value", async () => {
		await precompileUnits([type({ k: type.unit({}) })])
		const last = registeredReference(named("isInUnitPrecompiled", () => true))
		type({ k: type.unit([named("isInUnitPrecompiled", () => true)]) })
		const T = type("string").narrow(
			named("isInUnitPrecompiled", (s: string) => s.length > 1)
		)
		// the name after the last one registered
		const next = last.replace(
			/(?:\$(\d+))?$/,
			(_, n) => `$${Number(n ?? 0) + 1}`
		)
		attest(T.json).equals({ domain: "string", predicate: [next] })
	})

	it("misses a unit holding one of arktype's own functions for any other", async () => {
		const units = await precompileUnits([type("Date").narrow(isValidDate)])
		const T = type("Date").narrow((d: Date) => d.getUTCFullYear() > 2000)
		attest(isPrecompiled(units, T.internal)).equals(false)
		attest(T(new Date("1990-01-01T00:00:00.000Z")).toString()).snap(
			"must be valid according to an anonymous predicate (was an object)"
		)
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
