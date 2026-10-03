import { bench } from "@ark/attest"
import type { ArkErrors } from "arktype"
import * as v from "valibot"
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
} from "./scenarios.ts"

// pnpm test runs check(), which would slow zod's later benches here

bench("moltar allows (arktype)", () =>
	Moltar.arktype.allows(moltarData)
).median([8.03, "ns"])

// zod has no cheaper boolean check than safeParse(data).success
bench(
	"moltar allows (zod)",
	() => Moltar.zod.safeParse(moltarData).success
).median([166.67, "ns"])

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

bench(
	"moltar strict allows (zod)",
	() => MoltarStrict.zod.safeParse(moltarData).success
).median([289.08, "ns"])

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

bench(
	"moltar strict invalid allows (zod)",
	() => MoltarStrict.zod.safeParse(moltarExtraKeysData).success
).median([16.33, "us"])

bench("moltar strict invalid allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarExtraKeysData)
).median([1.18, "us"])

// arktype computes each message when read, so its error benches read summary
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

bench(
	"moltar invalid allows (zod)",
	() => Moltar.zod.safeParse(moltarInvalidData).success
).median([11.8, "us"])

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

bench("product allows (arktype)", () =>
	Product.arktype.allows(productData)
).median([1.05, "us"])

bench(
	"product allows (zod)",
	() => Product.zod.safeParse(productData).success
).median([7.49, "us"])

bench("product allows (valibot)", () =>
	v.is(Product.valibot, productData)
).median([11.54, "us"])

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

bench("product invalid allows (arktype)", () =>
	Product.arktype.allows(productInvalidData)
).median([25.54, "ns"])

bench(
	"product invalid allows (zod)",
	() => Product.zod.safeParse(productInvalidData).success
).median([101.39, "us"])

bench("product invalid allows (valibot)", () =>
	v.is(Product.valibot, productInvalidData)
).median([472, "ns"])

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

bench("items allows (arktype)", () => Items.arktype.allows(itemsData)).median([
	352.18,
	"ns"
])

bench(
	"items allows (zod)",
	() => Items.zod.safeParse(itemsData).success
).median([8.58, "us"])

bench("items allows (valibot)", () => v.is(Items.valibot, itemsData)).median([
	25.12,
	"us"
])

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

bench("items invalid allows (arktype)", () =>
	Items.arktype.allows(itemsInvalidData)
).median([151.61, "ns"])

bench(
	"items invalid allows (zod)",
	() => Items.zod.safeParse(itemsInvalidData).success
).median([21.5, "us"])

bench("items invalid allows (valibot)", () =>
	v.is(Items.valibot, itemsInvalidData)
).median([10.53, "us"])

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

bench("strings invalid allows (arktype)", () =>
	Strings.arktype.allows(stringsInvalidData)
).median([280.62, "ns"])

bench(
	"strings invalid allows (zod)",
	() => Strings.zod.safeParse(stringsInvalidData).success
).median([50.33, "us"])

bench("strings invalid allows (valibot)", () =>
	v.is(Strings.valibot, stringsInvalidData)
).median([14.28, "us"])

bench(
	"strings invalid errors (arktype)",
	() => (Strings.arktype(stringsInvalidData) as ArkErrors).summary
).median([5.04, "us"])

bench(
	"strings invalid errors (zod)",
	() => Strings.zod.safeParse(stringsInvalidData).error!.issues
).median([42.38, "us"])

bench(
	"strings invalid errors (valibot)",
	() => v.safeParse(Strings.valibot, stringsInvalidData).issues
).median([25.31, "us"])

bench("patterns invalid allows (arktype)", () =>
	Patterns.arktype.allows(patternsInvalidData)
).median([8.34, "us"])

bench(
	"patterns invalid allows (zod)",
	() => Patterns.zod.safeParse(patternsInvalidData).success
).median([27.73, "us"])

bench("patterns invalid allows (valibot)", () =>
	v.is(Patterns.valibot, patternsInvalidData)
).median([10.08, "us"])

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

bench("union items invalid allows (arktype)", () =>
	UnionItems.arktype.allows(unionItemsInvalidData)
).median([22.83, "ns"])

bench(
	"union items invalid allows (zod)",
	() => UnionItems.zod.safeParse(unionItemsInvalidData).success
).median([22.26, "us"])

bench("union items invalid allows (valibot)", () =>
	v.is(UnionItems.valibot, unionItemsInvalidData)
).median([2.68, "us"])

bench(
	"union items invalid errors (arktype)",
	() => (UnionItems.arktype(unionItemsInvalidData) as ArkErrors).summary
).median([9.06, "us"])

bench(
	"union items invalid errors (zod)",
	() => UnionItems.zod.safeParse(unionItemsInvalidData).error!.issues
).median([20.05, "us"])

bench(
	"union items invalid errors (valibot)",
	() => v.safeParse(UnionItems.valibot, unionItemsInvalidData).issues
).median([3.76, "us"])

bench("discriminated allows (arktype)", () =>
	discriminatedData.every(d => Discriminated.arktype.allows(d))
).median([26.03, "ns"])

bench("discriminated allows (zod)", () =>
	discriminatedData.every(d => Discriminated.zod.safeParse(d).success)
).median([648.96, "ns"])

bench("discriminated allows (valibot)", () =>
	discriminatedData.every(d => v.is(Discriminated.valibot, d))
).median([3.07, "us"])

bench("discriminated parse (arktype)", () =>
	discriminatedData.map(d => Discriminated.arktype(d))
).median([53.83, "ns"])

bench("discriminated parse (zod)", () =>
	discriminatedData.map(d => Discriminated.zod.safeParse(d))
).median([585.27, "ns"])

bench("discriminated parse (valibot)", () =>
	discriminatedData.map(d => v.safeParse(Discriminated.valibot, d))
).median([2.62, "us"])

bench("union allows (arktype)", () =>
	unionData.every(d => Union.arktype.allows(d))
).median([27.06, "ns"])

bench("union allows (zod)", () =>
	unionData.every(d => Union.zod.safeParse(d).success)
).median([1.61, "us"])

bench("union allows (valibot)", () =>
	unionData.every(d => v.is(Union.valibot, d))
).median([2.35, "us"])

bench("union parse (arktype)", () =>
	unionData.map(d => Union.arktype(d))
).median([53.05, "ns"])

bench("union parse (zod)", () =>
	unionData.map(d => Union.zod.safeParse(d))
).median([1.44, "us"])

bench("union parse (valibot)", () =>
	unionData.map(d => v.safeParse(Union.valibot, d))
).median([2.8, "us"])

bench("constraints allows (arktype)", () =>
	Constraints.arktype.allows(constraintsData)
).median([81.17, "ns"])

bench(
	"constraints allows (zod)",
	() => Constraints.zod.safeParse(constraintsData).success
).median([816.54, "ns"])

bench("constraints allows (valibot)", () =>
	v.is(Constraints.valibot, constraintsData)
).median([813.2, "ns"])

bench("constraints parse (arktype)", () =>
	Constraints.arktype(constraintsData)
).median([80.2, "ns"])

bench("constraints parse (zod)", () =>
	Constraints.zod.safeParse(constraintsData)
).median([756.43, "ns"])

bench("constraints parse (valibot)", () =>
	v.safeParse(Constraints.valibot, constraintsData)
).median([773.7, "ns"])

bench("index allows (arktype)", () => Index.arktype.allows(indexData)).median([
	107.08,
	"ns"
])

bench(
	"index allows (zod)",
	() => Index.zod.safeParse(indexData).success
).median([625.1, "ns"])

bench("index allows (valibot)", () => v.is(Index.valibot, indexData)).median([
	773.36,
	"ns"
])

bench("index parse (arktype)", () => Index.arktype(indexData)).median([
	102.3,
	"ns"
])

bench("index parse (zod)", () => Index.zod.safeParse(indexData)).median([
	761.41,
	"ns"
])

bench("index parse (valibot)", () =>
	v.safeParse(Index.valibot, indexData)
).median([1.02, "us"])

bench("dated allows (arktype)", () => Dated.arktype.allows(datedData)).median([
	6.92,
	"ns"
])

bench(
	"dated allows (zod)",
	() => Dated.zod.safeParse(datedData).success
).median([105.56, "ns"])

bench("dated allows (valibot)", () => v.is(Dated.valibot, datedData)).median([
	260.78,
	"ns"
])

bench("dated parse (arktype)", () => Dated.arktype(datedData)).median([
	9.56,
	"ns"
])

bench("dated parse (zod)", () => Dated.zod.safeParse(datedData)).median([
	87.23,
	"ns"
])

bench("dated parse (valibot)", () =>
	v.safeParse(Dated.valibot, datedData)
).median([267.87, "ns"])

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

bench("object morph parse (arktype)", () =>
	ObjectMorph.arktype(objectMorphData)
).median([3.3, "us"])

bench("object morph parse (zod)", () =>
	ObjectMorph.zod.safeParse(objectMorphData)
).median([469.33, "ns"])

bench("object morph parse (valibot)", () =>
	v.safeParse(ObjectMorph.valibot, objectMorphData)
).median([935.33, "ns"])

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

bench("nested defaults parse (arktype)", () =>
	NestedDefaults.arktype(nestedDefaultsData)
).median([2.5, "us"])

bench("nested defaults parse (zod)", () =>
	NestedDefaults.zod.safeParse(nestedDefaultsData)
).median([257.88, "ns"])

bench("nested defaults parse (valibot)", () =>
	v.safeParse(NestedDefaults.valibot, nestedDefaultsData)
).median([799.52, "ns"])

bench("tree allows (arktype)", () => Tree.arktype.allows(treeData)).median([
	1.32,
	"us"
])

bench("tree allows (zod)", () => Tree.zod.safeParse(treeData).success).median([
	4.92,
	"us"
])

bench("tree allows (valibot)", () => v.is(Tree.valibot, treeData)).median([
	9.55,
	"us"
])

bench("tree parse (arktype)", () => Tree.arktype(treeData)).median([3.24, "us"])

bench("tree parse (zod)", () => Tree.zod.safeParse(treeData)).median([
	3.92,
	"us"
])

bench("tree parse (valibot)", () => v.safeParse(Tree.valibot, treeData)).median(
	[8.38, "us"]
)

bench("recursive scope allows (arktype)", () =>
	RecursiveScope.arktype.allows(recursiveScopeData)
).median([188.92, "ns"])

bench(
	"recursive scope allows (zod)",
	() => RecursiveScope.zod.safeParse(recursiveScopeData).success
).median([3.42, "us"])

bench("recursive scope allows (valibot)", () =>
	v.is(RecursiveScope.valibot, recursiveScopeData)
).median([7.13, "us"])

bench("recursive scope parse (arktype)", () =>
	RecursiveScope.arktype(recursiveScopeData)
).median([186.94, "ns"])

bench("recursive scope parse (zod)", () =>
	RecursiveScope.zod.safeParse(recursiveScopeData)
).median([3.49, "us"])

bench("recursive scope parse (valibot)", () =>
	v.safeParse(RecursiveScope.valibot, recursiveScopeData)
).median([7.17, "us"])

bench("recursive morph allows (arktype)", () =>
	RecursiveMorph.arktype.allows(recursiveMorphData)
).median([391.99, "ns"])

bench(
	"recursive morph allows (zod)",
	() => RecursiveMorph.zod.safeParse(recursiveMorphData).success
).median([5.11, "us"])

bench("recursive morph allows (valibot)", () =>
	v.is(RecursiveMorph.valibot, recursiveMorphData)
).median([14.41, "us"])

bench("recursive morph parse (arktype)", () =>
	RecursiveMorph.arktype(recursiveMorphData)
).median([3.32, "us"])

bench("recursive morph parse (zod)", () =>
	RecursiveMorph.zod.safeParse(recursiveMorphData)
).median([5.27, "us"])

bench("recursive morph parse (valibot)", () =>
	v.safeParse(RecursiveMorph.valibot, recursiveMorphData)
).median([14.38, "us"])

bench("primitive allows (arktype)", () =>
	Primitive.arktype.allows(primitiveData)
).median([2.06, "ns"])

bench(
	"primitive allows (zod)",
	() => Primitive.zod.safeParse(primitiveData).success
).median([43.97, "ns"])

bench("primitive allows (valibot)", () =>
	v.is(Primitive.valibot, primitiveData)
).median([22.92, "ns"])

bench("primitive parse (arktype)", () =>
	Primitive.arktype(primitiveData)
).median([6.04, "ns"])

bench("primitive parse (zod)", () =>
	Primitive.zod.safeParse(primitiveData)
).median([46.91, "ns"])

bench("primitive parse (valibot)", () =>
	v.safeParse(Primitive.valibot, primitiveData)
).median([37.26, "ns"])
