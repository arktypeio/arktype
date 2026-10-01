import { bench } from "@ark/attest"
import type { ArkErrors } from "arktype"
import * as v from "valibot"
import {
	check,
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
	Patterns,
	patternsInvalidData,
	Product,
	productData,
	productInvalidData,
	Str,
	stringData,
	Strings,
	stringsInvalidData,
	Tree,
	treeData,
	Union,
	unionData,
	UnionItems,
	unionItemsInvalidData
} from "./scenarios.ts"

// Each library's fastest API for each operation:
// - allows: arktype's T.allows, valibot's v.is (which aborts early), zod's
//   safeParse(data).success (zod has no cheaper boolean check)
// - parse: arktype's T(data), zod's safeParse, valibot's v.safeParse
// - errors: every issue's path and message (see scenarios.ts)
// A bench over several inputs returns their combined result, which costs the
// same few ns for each library.

check()

bench("moltar allows (arktype)", () =>
	Moltar.arktype.allows(moltarData)
).median([13.66, "ns"])

bench(
	"moltar allows (zod)",
	() => Moltar.zod.safeParse(moltarData).success
).median([330.01, "ns"])

bench("moltar allows (valibot)", () => v.is(Moltar.valibot, moltarData)).median(
	[902.09, "ns"]
)

bench("moltar parse (arktype)", () => Moltar.arktype(moltarData)).median([
	17.1,
	"ns"
])

bench("moltar parse (zod)", () => Moltar.zod.safeParse(moltarData)).median([
	297.61,
	"ns"
])

bench("moltar parse (valibot)", () =>
	v.safeParse(Moltar.valibot, moltarData)
).median([895.91, "ns"])

bench("moltar strict allows (arktype)", () =>
	MoltarStrict.arktype.allows(moltarData)
).median([194.45, "ns"])

bench(
	"moltar strict allows (zod)",
	() => MoltarStrict.zod.safeParse(moltarData).success
).median([544.29, "ns"])

bench("moltar strict allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarData)
).median([1.12, "us"])

bench("moltar strict parse (arktype)", () =>
	MoltarStrict.arktype(moltarData)
).median([356.22, "ns"])

bench("moltar strict parse (zod)", () =>
	MoltarStrict.zod.safeParse(moltarData)
).median([855.66, "ns"])

bench("moltar strict parse (valibot)", () =>
	v.safeParse(MoltarStrict.valibot, moltarData)
).median([1.86, "us"])

bench("moltar strict invalid allows (arktype)", () =>
	MoltarStrict.arktype.allows(moltarExtraKeysData)
).median([141.9, "ns"])

bench(
	"moltar strict invalid allows (zod)",
	() => MoltarStrict.zod.safeParse(moltarExtraKeysData).success
).median([33.01, "us"])

bench("moltar strict invalid allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarExtraKeysData)
).median([2.5, "us"])

bench(
	"moltar strict invalid errors (arktype)",
	() => (MoltarStrict.arktype(moltarExtraKeysData) as ArkErrors).summary
).median([9.85, "us"])

bench(
	"moltar strict invalid errors (zod)",
	() => MoltarStrict.zod.safeParse(moltarExtraKeysData).error!.issues
).median([30.74, "us"])

bench(
	"moltar strict invalid errors (valibot)",
	() => v.safeParse(MoltarStrict.valibot, moltarExtraKeysData).issues
).median([2.66, "us"])

bench("moltar strip parse (arktype)", () =>
	MoltarStrip.arktype(moltarExtraKeysData)
).median([7.25, "us"])

bench("moltar strip parse (zod)", () =>
	MoltarStrip.zod.safeParse(moltarExtraKeysData)
).median([564.12, "ns"])

bench("moltar strip parse (valibot)", () =>
	v.safeParse(MoltarStrip.valibot, moltarExtraKeysData)
).median([1.37, "us"])

bench("moltar invalid allows (arktype)", () =>
	Moltar.arktype.allows(moltarInvalidData)
).median([7.14, "ns"])

bench(
	"moltar invalid allows (zod)",
	() => Moltar.zod.safeParse(moltarInvalidData).success
).median([18.19, "us"])

bench("moltar invalid allows (valibot)", () =>
	v.is(Moltar.valibot, moltarInvalidData)
).median([1.31, "us"])

bench(
	"moltar invalid errors (arktype)",
	() => (Moltar.arktype(moltarInvalidData) as ArkErrors).summary
).median([8.17, "us"])

bench(
	"moltar invalid errors (zod)",
	() => Moltar.zod.safeParse(moltarInvalidData).error!.issues
).median([17.12, "us"])

bench(
	"moltar invalid errors (valibot)",
	() => v.safeParse(Moltar.valibot, moltarInvalidData).issues
).median([1.36, "us"])

bench("product allows (arktype)", () =>
	Product.arktype.allows(productData)
).median([1.28, "us"])

bench(
	"product allows (zod)",
	() => Product.zod.safeParse(productData).success
).median([10.81, "us"])

bench("product allows (valibot)", () =>
	v.is(Product.valibot, productData)
).median([14.28, "us"])

bench("product parse (arktype)", () => Product.arktype(productData)).median([
	1.26,
	"us"
])

bench("product parse (zod)", () => Product.zod.safeParse(productData)).median([
	10.65,
	"us"
])

bench("product parse (valibot)", () =>
	v.safeParse(Product.valibot, productData)
).median([13.36, "us"])

bench("product invalid allows (arktype)", () =>
	Product.arktype.allows(productInvalidData)
).median([27.39, "ns"])

bench(
	"product invalid allows (zod)",
	() => Product.zod.safeParse(productInvalidData).success
).median([99.93, "us"])

bench("product invalid allows (valibot)", () =>
	v.is(Product.valibot, productInvalidData)
).median([618.9, "ns"])

bench(
	"product invalid errors (arktype)",
	() => (Product.arktype(productInvalidData) as ArkErrors).summary
).median([67.96, "us"])

bench(
	"product invalid errors (zod)",
	() => Product.zod.safeParse(productInvalidData).error!.issues
).median([111.26, "us"])

bench(
	"product invalid errors (valibot)",
	() => v.safeParse(Product.valibot, productInvalidData).issues
).median([42.85, "us"])

bench("items allows (arktype)", () => Items.arktype.allows(itemsData)).median([
	400.21,
	"ns"
])

bench(
	"items allows (zod)",
	() => Items.zod.safeParse(itemsData).success
).median([9.6, "us"])

bench("items allows (valibot)", () => v.is(Items.valibot, itemsData)).median([
	29.39,
	"us"
])

bench("items parse (arktype)", () => Items.arktype(itemsData)).median([
	358.09,
	"ns"
])

bench("items parse (zod)", () => Items.zod.safeParse(itemsData)).median([
	8.64,
	"us"
])

bench("items parse (valibot)", () =>
	v.safeParse(Items.valibot, itemsData)
).median([25.29, "us"])

bench("items invalid allows (arktype)", () =>
	Items.arktype.allows(itemsInvalidData)
).median([189.61, "ns"])

bench(
	"items invalid allows (zod)",
	() => Items.zod.safeParse(itemsInvalidData).success
).median([26.81, "us"])

bench("items invalid allows (valibot)", () =>
	v.is(Items.valibot, itemsInvalidData)
).median([13.7, "us"])

bench(
	"items invalid errors (arktype)",
	() => (Items.arktype(itemsInvalidData) as ArkErrors).summary
).median([10.44, "us"])

bench(
	"items invalid errors (zod)",
	() => Items.zod.safeParse(itemsInvalidData).error!.issues
).median([32.41, "us"])

bench(
	"items invalid errors (valibot)",
	() => v.safeParse(Items.valibot, itemsInvalidData).issues
).median([29.17, "us"])

bench("strings invalid allows (arktype)", () =>
	Strings.arktype.allows(stringsInvalidData)
).median([514.71, "ns"])

bench(
	"strings invalid allows (zod)",
	() => Strings.zod.safeParse(stringsInvalidData).success
).median([54.24, "us"])

bench("strings invalid allows (valibot)", () =>
	v.is(Strings.valibot, stringsInvalidData)
).median([16.07, "us"])

bench(
	"strings invalid errors (arktype)",
	() => (Strings.arktype(stringsInvalidData) as ArkErrors).summary
).median([5.43, "us"])

bench(
	"strings invalid errors (zod)",
	() => Strings.zod.safeParse(stringsInvalidData).error!.issues
).median([53.86, "us"])

bench(
	"strings invalid errors (valibot)",
	() => v.safeParse(Strings.valibot, stringsInvalidData).issues
).median([36.37, "us"])

bench("patterns invalid allows (arktype)", () =>
	Patterns.arktype.allows(patternsInvalidData)
).median([10.72, "us"])

bench(
	"patterns invalid allows (zod)",
	() => Patterns.zod.safeParse(patternsInvalidData).success
).median([30.54, "us"])

bench("patterns invalid allows (valibot)", () =>
	v.is(Patterns.valibot, patternsInvalidData)
).median([10.72, "us"])

bench(
	"patterns invalid errors (arktype)",
	() => (Patterns.arktype(patternsInvalidData) as ArkErrors).summary
).median([42.52, "us"])

bench(
	"patterns invalid errors (zod)",
	() => Patterns.zod.safeParse(patternsInvalidData).error!.issues
).median([30.58, "us"])

bench(
	"patterns invalid errors (valibot)",
	() => v.safeParse(Patterns.valibot, patternsInvalidData).issues
).median([11.28, "us"])

bench("union items invalid allows (arktype)", () =>
	UnionItems.arktype.allows(unionItemsInvalidData)
).median([26.19, "ns"])

bench(
	"union items invalid allows (zod)",
	() => UnionItems.zod.safeParse(unionItemsInvalidData).success
).median([24.07, "us"])

bench("union items invalid allows (valibot)", () =>
	v.is(UnionItems.valibot, unionItemsInvalidData)
).median([3.06, "us"])

bench(
	"union items invalid errors (arktype)",
	() => (UnionItems.arktype(unionItemsInvalidData) as ArkErrors).summary
).median([10.06, "us"])

bench(
	"union items invalid errors (zod)",
	() => UnionItems.zod.safeParse(unionItemsInvalidData).error!.issues
).median([23.71, "us"])

bench(
	"union items invalid errors (valibot)",
	() => v.safeParse(UnionItems.valibot, unionItemsInvalidData).issues
).median([4.13, "us"])

bench("discriminated allows (arktype)", () =>
	discriminatedData.every(d => Discriminated.arktype.allows(d))
).median([29.4, "ns"])

bench("discriminated allows (zod)", () =>
	discriminatedData.every(d => Discriminated.zod.safeParse(d).success)
).median([744.88, "ns"])

bench("discriminated allows (valibot)", () =>
	discriminatedData.every(d => v.is(Discriminated.valibot, d))
).median([3.46, "us"])

bench("discriminated parse (arktype)", () =>
	discriminatedData.map(d => Discriminated.arktype(d))
).median([67.11, "ns"])

bench("discriminated parse (zod)", () =>
	discriminatedData.map(d => Discriminated.zod.safeParse(d))
).median([1.04, "us"])

bench("discriminated parse (valibot)", () =>
	discriminatedData.map(d => v.safeParse(Discriminated.valibot, d))
).median([3.44, "us"])

bench("union allows (arktype)", () =>
	unionData.every(d => Union.arktype.allows(d))
).median([33.21, "ns"])

bench("union allows (zod)", () =>
	unionData.every(d => Union.zod.safeParse(d).success)
).median([1.77, "us"])

bench("union allows (valibot)", () =>
	unionData.every(d => v.is(Union.valibot, d))
).median([2.96, "us"])

bench("union parse (arktype)", () =>
	unionData.map(d => Union.arktype(d))
).median([69.75, "ns"])

bench("union parse (zod)", () =>
	unionData.map(d => Union.zod.safeParse(d))
).median([1.97, "us"])

bench("union parse (valibot)", () =>
	unionData.map(d => v.safeParse(Union.valibot, d))
).median([4.37, "us"])

bench("constraints allows (arktype)", () =>
	Constraints.arktype.allows(constraintsData)
).median([85.44, "ns"])

bench(
	"constraints allows (zod)",
	() => Constraints.zod.safeParse(constraintsData).success
).median([916.17, "ns"])

bench("constraints allows (valibot)", () =>
	v.is(Constraints.valibot, constraintsData)
).median([990.42, "ns"])

bench("constraints parse (arktype)", () =>
	Constraints.arktype(constraintsData)
).median([90.48, "ns"])

bench("constraints parse (zod)", () =>
	Constraints.zod.safeParse(constraintsData)
).median([946.6, "ns"])

bench("constraints parse (valibot)", () =>
	v.safeParse(Constraints.valibot, constraintsData)
).median([937.29, "ns"])

bench("index allows (arktype)", () => Index.arktype.allows(indexData)).median([
	105.43,
	"ns"
])

bench(
	"index allows (zod)",
	() => Index.zod.safeParse(indexData).success
).median([677.67, "ns"])

bench("index allows (valibot)", () => v.is(Index.valibot, indexData)).median([
	1.02,
	"us"
])

bench("index parse (arktype)", () => Index.arktype(indexData)).median([
	117.21,
	"ns"
])

bench("index parse (zod)", () => Index.zod.safeParse(indexData)).median([
	754.27,
	"ns"
])

bench("index parse (valibot)", () =>
	v.safeParse(Index.valibot, indexData)
).median([991.28, "ns"])

bench("date allows (arktype)", () => Dated.arktype.allows(datedData)).median([
	7.43,
	"ns"
])

bench("date allows (zod)", () => Dated.zod.safeParse(datedData).success).median(
	[149.97, "ns"]
)

bench("date allows (valibot)", () => v.is(Dated.valibot, datedData)).median([
	534.7,
	"ns"
])

bench("date parse (arktype)", () => Dated.arktype(datedData)).median([
	12.44,
	"ns"
])

bench("date parse (zod)", () => Dated.zod.safeParse(datedData)).median([
	114.41,
	"ns"
])

bench("date parse (valibot)", () =>
	v.safeParse(Dated.valibot, datedData)
).median([283.27, "ns"])

bench("morph parse (arktype)", () => Morph.arktype(morphData)).median([
	35.85,
	"ns"
])

bench("morph parse (zod)", () => Morph.zod.safeParse(morphData)).median([
	179.64,
	"ns"
])

bench("morph parse (valibot)", () =>
	v.safeParse(Morph.valibot, morphData)
).median([112.06, "ns"])

bench("object morph parse (arktype)", () =>
	ObjectMorph.arktype(objectMorphData)
).median([3.22, "us"])

bench("object morph parse (zod)", () =>
	ObjectMorph.zod.safeParse(objectMorphData)
).median([441.56, "ns"])

bench("object morph parse (valibot)", () =>
	v.safeParse(ObjectMorph.valibot, objectMorphData)
).median([703.79, "ns"])

bench("defaults parse (arktype)", () => Defaults.arktype(defaultsData)).median([
	618.53,
	"ns"
])

bench("defaults parse (zod)", () =>
	Defaults.zod.safeParse(defaultsData)
).median([203.48, "ns"])

bench("defaults parse (valibot)", () =>
	v.safeParse(Defaults.valibot, defaultsData)
).median([533.58, "ns"])

bench("nested defaults parse (arktype)", () =>
	NestedDefaults.arktype(nestedDefaultsData)
).median([2.61, "us"])

bench("nested defaults parse (zod)", () =>
	NestedDefaults.zod.safeParse(nestedDefaultsData)
).median([278.26, "ns"])

bench("nested defaults parse (valibot)", () =>
	v.safeParse(NestedDefaults.valibot, nestedDefaultsData)
).median([865.75, "ns"])

bench("tree allows (arktype)", () => Tree.arktype.allows(treeData)).median([
	1.22,
	"us"
])

bench("tree allows (zod)", () => Tree.zod.safeParse(treeData).success).median([
	4.19,
	"us"
])

bench("tree allows (valibot)", () => v.is(Tree.valibot, treeData)).median([
	10.1,
	"us"
])

bench("tree parse (arktype)", () => Tree.arktype(treeData)).median([3.4, "us"])

bench("tree parse (zod)", () => Tree.zod.safeParse(treeData)).median([
	6.72,
	"us"
])

bench("tree parse (valibot)", () => v.safeParse(Tree.valibot, treeData)).median(
	[10.17, "us"]
)

bench("string allows (arktype)", () => Str.arktype.allows(stringData)).median([
	2.63,
	"ns"
])

bench(
	"string allows (zod)",
	() => Str.zod.safeParse(stringData).success
).median([50.09, "ns"])

bench("string allows (valibot)", () => v.is(Str.valibot, stringData)).median([
	25.8,
	"ns"
])

bench("string parse (arktype)", () => Str.arktype(stringData)).median([
	6.72,
	"ns"
])

bench("string parse (zod)", () => Str.zod.safeParse(stringData)).median([
	53.64,
	"ns"
])

bench("string parse (valibot)", () =>
	v.safeParse(Str.valibot, stringData)
).median([40.49, "ns"])
