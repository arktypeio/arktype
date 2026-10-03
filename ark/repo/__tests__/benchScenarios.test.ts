import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import * as v from "valibot"
import type { z } from "zod"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	Constraints,
	constraintsData,
	Dated,
	datedData,
	Defaults,
	defaultsData,
	Discriminated,
	discriminatedData,
	Index,
	indexData,
	Items,
	itemsData,
	itemsInvalidData,
	Moltar,
	moltarData,
	moltarExtraKeysData,
	moltarInvalidData,
	MoltarStrict,
	MoltarStrip,
	Morph,
	morphData,
	NestedDefaults,
	nestedDefaultsData,
	ObjectMorph,
	objectMorphData,
	parsedMorphNode,
	Patterns,
	patternsInvalidData,
	Primitive,
	primitiveData,
	Product,
	productData,
	productInvalidData,
	RecursiveMorph,
	recursiveMorphData,
	RecursiveScope,
	recursiveScopeData,
	Strings,
	stringsInvalidData,
	Tree,
	treeData,
	Union,
	unionData,
	UnionItems,
	unionItemsInvalidData
} from "../bench/scenarios.ts"

type Schemas = {
	arktype: { (data: unknown): unknown; allows(data: unknown): boolean }
	zod: z.ZodType
	valibot: v.GenericSchema
}

const resultsOf = (schemas: Schemas, data: unknown) => {
	const arktypeOut = schemas.arktype(data)
	const zodResult = schemas.zod.safeParse(data)
	const valibotResult = v.safeParse(schemas.valibot, data)
	return {
		allows: [
			schemas.arktype.allows(data),
			zodResult.success,
			v.is(schemas.valibot, data)
		],
		out: [
			arktypeOut instanceof type.errors ? undefined : arktypeOut,
			zodResult.data,
			valibotResult.success ? valibotResult.output : undefined
		],
		issues: [
			arktypeOut instanceof type.errors ? arktypeOut.count : 0,
			zodResult.error?.issues.length ?? 0,
			valibotResult.issues?.length ?? 0
		]
	}
}

const accepts = (schemas: Schemas, data: unknown, expected: unknown = data) => {
	const before = structuredClone(data)
	const { allows, out } = resultsOf(schemas, data)
	attest(allows).equals([true, true, true])
	attest(out).equals([expected, expected, expected])
	attest(data).equals(before)
}

const rejects = (schemas: Schemas, data: unknown) => {
	const { allows, issues } = resultsOf(schemas, data)
	attest(allows).equals([false, false, false])
	// abortEarly is off, so every library reports every issue
	attest(issues).equals([issues[0], issues[0], issues[0]])
}

contextualize(() => {
	it("accepts alike", () => {
		accepts(Moltar, moltarData)
		accepts(MoltarStrict, moltarData)
		accepts(MoltarStrip, moltarExtraKeysData, moltarData)
		accepts(Product, productData)
		accepts(Items, itemsData)
		for (const data of discriminatedData) accepts(Discriminated, data)
		for (const data of unionData) accepts(Union, data)
		accepts(Constraints, constraintsData)
		accepts(Index, indexData)
		accepts(Dated, datedData)
		accepts(Morph, morphData, 12345)
		accepts(ObjectMorph, objectMorphData, { ...objectMorphData, a: "x" })
		accepts(Defaults, defaultsData, { a: "s", b: 5, c: true, d: "x" })
		accepts(NestedDefaults, nestedDefaultsData, {
			...nestedDefaultsData,
			inner: { a: "y", b: 5 }
		})
		accepts(Tree, treeData)
		accepts(RecursiveScope, recursiveScopeData)
		accepts(
			RecursiveMorph,
			recursiveMorphData,
			parsedMorphNode(recursiveMorphData)
		)
		accepts(Primitive, primitiveData)
	})

	it("rejects alike", () => {
		rejects(MoltarStrict, moltarExtraKeysData)
		rejects(Moltar, moltarInvalidData)
		rejects(Product, productInvalidData)
		rejects(Items, itemsInvalidData)
		rejects(Strings, stringsInvalidData)
		rejects(Patterns, patternsInvalidData)
		rejects(UnionItems, unionItemsInvalidData)
	})
})
