import { bench } from "@ark/attest"
import type { ArkErrors } from "arktype"
import * as v from "valibot"
import {
	Constraints,
	constraintsData,
	Defaults,
	defaultsData,
	Discriminated,
	discriminatedData,
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
	Patterns,
	patternsInvalidData,
	Product,
	productData,
	productInvalidData,
	Tree,
	treeData
} from "./scenarios.ts"

bench("moltar allows (arktype)", () =>
	Moltar.arktype.allows(moltarData)
).median([8.03, "ns"])

bench("moltar allows (valibot)", () => v.is(Moltar.valibot, moltarData)).median(
	[700.18, "ns"]
)

bench("moltar parse (arktype)", () => Moltar.arktype(moltarData)).median([
	10.8,
	"ns"
])

bench("moltar parse (zod)", () => Moltar.zod.safeParse(moltarData)).median([
	162.19,
	"ns"
])

bench("moltar parse (valibot)", () =>
	v.safeParse(Moltar.valibot, moltarData)
).median([718.17, "ns"])

bench("moltar strict allows (arktype)", () =>
	MoltarStrict.arktype.allows(moltarData)
).median([150.27, "ns"])

bench("moltar strict allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarData)
).median([771.32, "ns"])

bench("moltar strict parse (arktype)", () =>
	MoltarStrict.arktype(moltarData)
).median([146.8, "ns"])

bench("moltar strict parse (zod)", () =>
	MoltarStrict.zod.safeParse(moltarData)
).median([293.82, "ns"])

bench("moltar strict parse (valibot)", () =>
	v.safeParse(MoltarStrict.valibot, moltarData)
).median([925.28, "ns"])

bench("moltar strict invalid allows (arktype)", () =>
	MoltarStrict.arktype.allows(moltarExtraKeysData)
).median([74.41, "ns"])

bench("moltar strict invalid allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarExtraKeysData)
).median([1.18, "us"])

// summary makes arktype compute the messages zod and valibot build eagerly
bench(
	"moltar strict invalid errors (arktype)",
	() => (MoltarStrict.arktype(moltarExtraKeysData) as ArkErrors).summary
).median([4.95, "us"])

bench(
	"moltar strict invalid errors (zod)",
	() => MoltarStrict.zod.safeParse(moltarExtraKeysData).error!.issues
).median([16.12, "us"])

bench(
	"moltar strict invalid errors (valibot)",
	() => v.safeParse(MoltarStrict.valibot, moltarExtraKeysData).issues
).median([1.47, "us"])

bench("moltar strip parse (arktype)", () =>
	MoltarStrip.arktype(moltarExtraKeysData)
).median([3.69, "us"])

bench("moltar strip parse (zod)", () =>
	MoltarStrip.zod.safeParse(moltarExtraKeysData)
).median([210.24, "ns"])

bench("moltar strip parse (valibot)", () =>
	v.safeParse(MoltarStrip.valibot, moltarExtraKeysData)
).median([743.87, "ns"])

bench("moltar invalid allows (arktype)", () =>
	Moltar.arktype.allows(moltarInvalidData)
).median([5.26, "ns"])

bench("moltar invalid allows (valibot)", () =>
	v.is(Moltar.valibot, moltarInvalidData)
).median([974.94, "ns"])

bench(
	"moltar invalid errors (arktype)",
	() => (Moltar.arktype(moltarInvalidData) as ArkErrors).summary
).median([6.51, "us"])

bench(
	"moltar invalid errors (zod)",
	() => Moltar.zod.safeParse(moltarInvalidData).error!.issues
).median([14.61, "us"])

bench(
	"moltar invalid errors (valibot)",
	() => v.safeParse(Moltar.valibot, moltarInvalidData).issues
).median([1.12, "us"])

bench("product parse (arktype)", () => Product.arktype(productData)).median([
	1.2,
	"us"
])

bench("product parse (zod)", () => Product.zod.safeParse(productData)).median([
	8.33,
	"us"
])

bench("product parse (valibot)", () =>
	v.safeParse(Product.valibot, productData)
).median([12.43, "us"])

bench(
	"product invalid errors (arktype)",
	() => (Product.arktype(productInvalidData) as ArkErrors).summary
).median([64.95, "us"])

bench(
	"product invalid errors (zod)",
	() => Product.zod.safeParse(productInvalidData).error!.issues
).median([98.05, "us"])

bench(
	"product invalid errors (valibot)",
	() => v.safeParse(Product.valibot, productInvalidData).issues
).median([32.11, "us"])

bench("items parse (arktype)", () => Items.arktype(itemsData)).median([
	273.83,
	"ns"
])

bench("items parse (zod)", () => Items.zod.safeParse(itemsData)).median([
	7.05,
	"us"
])

bench("items parse (valibot)", () =>
	v.safeParse(Items.valibot, itemsData)
).median([20.27, "us"])

bench(
	"items invalid errors (arktype)",
	() => (Items.arktype(itemsInvalidData) as ArkErrors).summary
).median([7.28, "us"])

bench(
	"items invalid errors (zod)",
	() => Items.zod.safeParse(itemsInvalidData).error!.issues
).median([24.56, "us"])

bench(
	"items invalid errors (valibot)",
	() => v.safeParse(Items.valibot, itemsInvalidData).issues
).median([23.64, "us"])

bench(
	"patterns invalid errors (arktype)",
	() => (Patterns.arktype(patternsInvalidData) as ArkErrors).summary
).median([48.56, "us"])

bench(
	"patterns invalid errors (zod)",
	() => Patterns.zod.safeParse(patternsInvalidData).error!.issues
).median([27.43, "us"])

bench(
	"patterns invalid errors (valibot)",
	() => v.safeParse(Patterns.valibot, patternsInvalidData).issues
).median([10.21, "us"])

bench("discriminated parse (arktype)", () =>
	discriminatedData.map(d => Discriminated.arktype(d))
).median([53.83, "ns"])

bench("discriminated parse (zod)", () =>
	discriminatedData.map(d => Discriminated.zod.safeParse(d))
).median([585.27, "ns"])

bench("discriminated parse (valibot)", () =>
	discriminatedData.map(d => v.safeParse(Discriminated.valibot, d))
).median([2.62, "us"])

bench("constraints parse (arktype)", () =>
	Constraints.arktype(constraintsData)
).median([80.2, "ns"])

bench("constraints parse (zod)", () =>
	Constraints.zod.safeParse(constraintsData)
).median([756.43, "ns"])

bench("constraints parse (valibot)", () =>
	v.safeParse(Constraints.valibot, constraintsData)
).median([773.7, "ns"])

bench("morph parse (arktype)", () => Morph.arktype(morphData)).median([
	40.5,
	"ns"
])

bench("morph parse (zod)", () => Morph.zod.safeParse(morphData)).median([
	265,
	"ns"
])

bench("morph parse (valibot)", () =>
	v.safeParse(Morph.valibot, morphData)
).median([117.08, "ns"])

bench("defaults parse (arktype)", () => Defaults.arktype(defaultsData)).median([
	697.76,
	"ns"
])

bench("defaults parse (zod)", () =>
	Defaults.zod.safeParse(defaultsData)
).median([209.47, "ns"])

bench("defaults parse (valibot)", () =>
	v.safeParse(Defaults.valibot, defaultsData)
).median([518.05, "ns"])

bench("tree parse (arktype)", () => Tree.arktype(treeData)).median([3.24, "us"])

bench("tree parse (zod)", () => Tree.zod.safeParse(treeData)).median([
	3.92,
	"us"
])

bench("tree parse (valibot)", () => v.safeParse(Tree.valibot, treeData)).median(
	[8.38, "us"]
)
