import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import * as v from "valibot"
import type { z } from "zod"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	Constraints,
	constraintsData,
	Defaults,
	defaultsData,
	Discriminated,
	discriminatedData,
	Items,
	itemsData,
	ItemsDefaults,
	itemsDefaultsData,
	itemsInvalidData,
	ItemsMorph,
	itemsMorphData,
	Moltar,
	moltarData,
	moltarExtraKeysData,
	moltarInvalidData,
	MoltarMorph,
	moltarMorphData,
	MoltarStrict,
	MoltarStrip,
	Morph,
	morphData,
	Patterns,
	patternsInvalidData,
	Product,
	productData,
	productExtraKeysData,
	productInvalidData,
	ProductStrip,
	Rotating,
	rotatingData,
	Tree,
	treeData
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
	// with abortEarly off, every library reports every issue
	attest(issues).equals([issues[0], issues[0], issues[0]])
}

contextualize(() => {
	it("accepts alike", () => {
		accepts(Moltar, moltarData)
		accepts(MoltarStrict, moltarData)
		accepts(MoltarStrip, moltarExtraKeysData, moltarData)
		accepts(Product, productData)
		accepts(ProductStrip, productExtraKeysData, productData)
		accepts(Items, itemsData)
		for (const data of discriminatedData) accepts(Discriminated, data)
		for (const [i, data] of rotatingData.entries()) accepts(Rotating[i], data)
		accepts(Constraints, constraintsData)
		accepts(Morph, morphData, 12345)
		accepts(Defaults, defaultsData, { a: "s", b: 5, c: true, d: "x" })
		accepts(Tree, treeData)
	})

	// rows whose every output is new remove undeclared keys alike
	it("transforms alike, removing undeclared keys", () => {
		accepts(
			Defaults,
			{ ...defaultsData, extra: 1 },
			{ a: "s", b: 5, c: true, d: "x" }
		)
		const [item] = itemsMorphData
		accepts(ItemsMorph, [{ ...item, extra: 1 }], [{ ...item, count: 0 }])
		const [defaulted] = itemsDefaultsData
		accepts(
			ItemsDefaults,
			[{ ...defaulted, extra: 1 }],
			[{ ...defaulted, active: false }]
		)
		const { deeplyNested } = moltarMorphData
		accepts(
			MoltarMorph,
			{
				...moltarMorphData,
				extra: 1,
				deeplyNested: { ...deeplyNested, extra: 1 }
			},
			{ ...moltarMorphData, deeplyNested: { ...deeplyNested, num: 1 } }
		)
	})

	it("rejects alike", () => {
		rejects(MoltarStrict, moltarExtraKeysData)
		rejects(Moltar, moltarInvalidData)
		rejects(Product, productInvalidData)
		rejects(Items, itemsInvalidData)
		rejects(Patterns, patternsInvalidData)
	})
})
