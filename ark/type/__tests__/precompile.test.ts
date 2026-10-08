import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	isNode,
	precompileByContent,
	Traversal,
	type NodeId
} from "@ark/schema"
import { liftArray } from "@ark/util"
import { keywords, scope, type } from "arktype"
import * as keywordFunctions from "arktype/internal/keywords/functions.ts"
import { isEpochString } from "arktype/internal/keywords/string.ts"
import {
	corpus,
	isPrecompiled,
	observe,
	precompile as precompileUnits
} from "./integration/precompiled.ts"

contextualize(() => {
	const isEven = (n: number) => n % 2 === 0

	const define = () =>
		scope({
			user: { name: "string", age: "number.integer >= 0" },
			even: ["number", ":", isEven],
			tree: { value: "number", "children?": "tree[]" },
			a: { n: "string.numeric.parse", "b?": "b" },
			b: { "a?": "a" }
		}).export()

	const precompile = (types: ReturnType<typeof define>) =>
		precompileByContent(Object.values(types).map(t => t.internal))

	it("names a unit by its content", () => {
		const first = precompile(define())
		for (let i = 0; i < 40; i++) type({ [`k${i}`]: `number > ${i}` })
		const second = precompile(define())
		attest(Object.keys(second.names)[0] === Object.keys(first.names)[0]).equals(
			false
		)
		attest(second.source).equals(first.source)
	})

	it("validates with a unit named by content", () => {
		const types = define()
		const unit = precompile(types)
		const traversals = new Function(`return ${unit.source}`)()(
			[],
			unit.refs,
			unit.errorContexts
		)
		const declaredNames = [...new Set(Object.values(unit.names))]
		const apply = (t: { internal: { id: NodeId } }, data: unknown) => {
			const ctx = new Traversal(data, $ark.resolvedConfig!)
			traversals[declaredNames.indexOf(unit.names[t.internal.id])][1](data, ctx)
			return ctx.finalize()
		}
		const data: any = { n: "1", b: { a: { n: "x" } } }
		data.b.a.b = data.b
		attest(String(apply(types.a, data))).equals(String(types.a(data)))
		attest(String(apply(types.tree, { value: 1, children: [{}] }))).equals(
			String(types.tree({ value: 1, children: [{}] }))
		)
		attest(String(apply(types.even, 3))).equals(String(types.even(3)))
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
			isEpochString,
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
		attest<unknown>(Undefinable({ precompiledOptional: undefined })).equals({
			precompiledOptional: undefined
		})
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
