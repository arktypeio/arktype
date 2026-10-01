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
).median()

bench(
	"moltar allows (zod)",
	() => Moltar.zod.safeParse(moltarData).success
).median()

bench("moltar allows (valibot)", () =>
	v.is(Moltar.valibot, moltarData)
).median()

bench("moltar parse (arktype)", () => Moltar.arktype(moltarData)).median()

bench("moltar parse (zod)", () => Moltar.zod.safeParse(moltarData)).median()

bench("moltar parse (valibot)", () =>
	v.safeParse(Moltar.valibot, moltarData)
).median()

bench("moltar strict allows (arktype)", () =>
	MoltarStrict.arktype.allows(moltarData)
).median()

bench(
	"moltar strict allows (zod)",
	() => MoltarStrict.zod.safeParse(moltarData).success
).median()

bench("moltar strict allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarData)
).median()

bench("moltar strict parse (arktype)", () =>
	MoltarStrict.arktype(moltarData)
).median()

bench("moltar strict parse (zod)", () =>
	MoltarStrict.zod.safeParse(moltarData)
).median()

bench("moltar strict parse (valibot)", () =>
	v.safeParse(MoltarStrict.valibot, moltarData)
).median()

bench("moltar strict invalid allows (arktype)", () =>
	MoltarStrict.arktype.allows(moltarExtraKeysData)
).median()

bench(
	"moltar strict invalid allows (zod)",
	() => MoltarStrict.zod.safeParse(moltarExtraKeysData).success
).median()

bench("moltar strict invalid allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarExtraKeysData)
).median()

bench(
	"moltar strict invalid errors (arktype)",
	() => (MoltarStrict.arktype(moltarExtraKeysData) as ArkErrors).summary
).median()

bench(
	"moltar strict invalid errors (zod)",
	() => MoltarStrict.zod.safeParse(moltarExtraKeysData).error!.issues
).median()

bench(
	"moltar strict invalid errors (valibot)",
	() => v.safeParse(MoltarStrict.valibot, moltarExtraKeysData).issues
).median()

bench("moltar strip parse (arktype)", () =>
	MoltarStrip.arktype(moltarExtraKeysData)
).median()

bench("moltar strip parse (zod)", () =>
	MoltarStrip.zod.safeParse(moltarExtraKeysData)
).median()

bench("moltar strip parse (valibot)", () =>
	v.safeParse(MoltarStrip.valibot, moltarExtraKeysData)
).median()

bench("moltar invalid allows (arktype)", () =>
	Moltar.arktype.allows(moltarInvalidData)
).median()

bench(
	"moltar invalid allows (zod)",
	() => Moltar.zod.safeParse(moltarInvalidData).success
).median()

bench("moltar invalid allows (valibot)", () =>
	v.is(Moltar.valibot, moltarInvalidData)
).median()

bench(
	"moltar invalid errors (arktype)",
	() => (Moltar.arktype(moltarInvalidData) as ArkErrors).summary
).median()

bench(
	"moltar invalid errors (zod)",
	() => Moltar.zod.safeParse(moltarInvalidData).error!.issues
).median()

bench(
	"moltar invalid errors (valibot)",
	() => v.safeParse(Moltar.valibot, moltarInvalidData).issues
).median()

bench("product allows (arktype)", () =>
	Product.arktype.allows(productData)
).median()

bench(
	"product allows (zod)",
	() => Product.zod.safeParse(productData).success
).median()

bench("product allows (valibot)", () =>
	v.is(Product.valibot, productData)
).median()

bench("product parse (arktype)", () => Product.arktype(productData)).median()

bench("product parse (zod)", () => Product.zod.safeParse(productData)).median()

bench("product parse (valibot)", () =>
	v.safeParse(Product.valibot, productData)
).median()

bench("product invalid allows (arktype)", () =>
	Product.arktype.allows(productInvalidData)
).median()

bench(
	"product invalid allows (zod)",
	() => Product.zod.safeParse(productInvalidData).success
).median()

bench("product invalid allows (valibot)", () =>
	v.is(Product.valibot, productInvalidData)
).median()

bench(
	"product invalid errors (arktype)",
	() => (Product.arktype(productInvalidData) as ArkErrors).summary
).median()

bench(
	"product invalid errors (zod)",
	() => Product.zod.safeParse(productInvalidData).error!.issues
).median()

bench(
	"product invalid errors (valibot)",
	() => v.safeParse(Product.valibot, productInvalidData).issues
).median()

bench("items allows (arktype)", () => Items.arktype.allows(itemsData)).median()

bench(
	"items allows (zod)",
	() => Items.zod.safeParse(itemsData).success
).median()

bench("items allows (valibot)", () => v.is(Items.valibot, itemsData)).median()

bench("items parse (arktype)", () => Items.arktype(itemsData)).median()

bench("items parse (zod)", () => Items.zod.safeParse(itemsData)).median()

bench("items parse (valibot)", () =>
	v.safeParse(Items.valibot, itemsData)
).median()

bench("items invalid allows (arktype)", () =>
	Items.arktype.allows(itemsInvalidData)
).median()

bench(
	"items invalid allows (zod)",
	() => Items.zod.safeParse(itemsInvalidData).success
).median()

bench("items invalid allows (valibot)", () =>
	v.is(Items.valibot, itemsInvalidData)
).median()

bench(
	"items invalid errors (arktype)",
	() => (Items.arktype(itemsInvalidData) as ArkErrors).summary
).median()

bench(
	"items invalid errors (zod)",
	() => Items.zod.safeParse(itemsInvalidData).error!.issues
).median()

bench(
	"items invalid errors (valibot)",
	() => v.safeParse(Items.valibot, itemsInvalidData).issues
).median()

bench("strings invalid allows (arktype)", () =>
	Strings.arktype.allows(stringsInvalidData)
).median()

bench(
	"strings invalid allows (zod)",
	() => Strings.zod.safeParse(stringsInvalidData).success
).median()

bench("strings invalid allows (valibot)", () =>
	v.is(Strings.valibot, stringsInvalidData)
).median()

bench(
	"strings invalid errors (arktype)",
	() => (Strings.arktype(stringsInvalidData) as ArkErrors).summary
).median()

bench(
	"strings invalid errors (zod)",
	() => Strings.zod.safeParse(stringsInvalidData).error!.issues
).median()

bench(
	"strings invalid errors (valibot)",
	() => v.safeParse(Strings.valibot, stringsInvalidData).issues
).median()

bench("patterns invalid allows (arktype)", () =>
	Patterns.arktype.allows(patternsInvalidData)
).median()

bench(
	"patterns invalid allows (zod)",
	() => Patterns.zod.safeParse(patternsInvalidData).success
).median()

bench("patterns invalid allows (valibot)", () =>
	v.is(Patterns.valibot, patternsInvalidData)
).median()

bench(
	"patterns invalid errors (arktype)",
	() => (Patterns.arktype(patternsInvalidData) as ArkErrors).summary
).median()

bench(
	"patterns invalid errors (zod)",
	() => Patterns.zod.safeParse(patternsInvalidData).error!.issues
).median()

bench(
	"patterns invalid errors (valibot)",
	() => v.safeParse(Patterns.valibot, patternsInvalidData).issues
).median()

bench("union items invalid allows (arktype)", () =>
	UnionItems.arktype.allows(unionItemsInvalidData)
).median()

bench(
	"union items invalid allows (zod)",
	() => UnionItems.zod.safeParse(unionItemsInvalidData).success
).median()

bench("union items invalid allows (valibot)", () =>
	v.is(UnionItems.valibot, unionItemsInvalidData)
).median()

bench(
	"union items invalid errors (arktype)",
	() => (UnionItems.arktype(unionItemsInvalidData) as ArkErrors).summary
).median()

bench(
	"union items invalid errors (zod)",
	() => UnionItems.zod.safeParse(unionItemsInvalidData).error!.issues
).median()

bench(
	"union items invalid errors (valibot)",
	() => v.safeParse(UnionItems.valibot, unionItemsInvalidData).issues
).median()

bench("discriminated allows (arktype)", () =>
	discriminatedData.every(d => Discriminated.arktype.allows(d))
).median()

bench("discriminated allows (zod)", () =>
	discriminatedData.every(d => Discriminated.zod.safeParse(d).success)
).median()

bench("discriminated allows (valibot)", () =>
	discriminatedData.every(d => v.is(Discriminated.valibot, d))
).median()

bench("discriminated parse (arktype)", () =>
	discriminatedData.map(d => Discriminated.arktype(d))
).median()

bench("discriminated parse (zod)", () =>
	discriminatedData.map(d => Discriminated.zod.safeParse(d))
).median()

bench("discriminated parse (valibot)", () =>
	discriminatedData.map(d => v.safeParse(Discriminated.valibot, d))
).median()

bench("union allows (arktype)", () =>
	unionData.every(d => Union.arktype.allows(d))
).median()

bench("union allows (zod)", () =>
	unionData.every(d => Union.zod.safeParse(d).success)
).median()

bench("union allows (valibot)", () =>
	unionData.every(d => v.is(Union.valibot, d))
).median()

bench("union parse (arktype)", () =>
	unionData.map(d => Union.arktype(d))
).median()

bench("union parse (zod)", () =>
	unionData.map(d => Union.zod.safeParse(d))
).median()

bench("union parse (valibot)", () =>
	unionData.map(d => v.safeParse(Union.valibot, d))
).median()

bench("constraints allows (arktype)", () =>
	Constraints.arktype.allows(constraintsData)
).median()

bench(
	"constraints allows (zod)",
	() => Constraints.zod.safeParse(constraintsData).success
).median()

bench("constraints allows (valibot)", () =>
	v.is(Constraints.valibot, constraintsData)
).median()

bench("constraints parse (arktype)", () =>
	Constraints.arktype(constraintsData)
).median()

bench("constraints parse (zod)", () =>
	Constraints.zod.safeParse(constraintsData)
).median()

bench("constraints parse (valibot)", () =>
	v.safeParse(Constraints.valibot, constraintsData)
).median()

bench("index allows (arktype)", () => Index.arktype.allows(indexData)).median()

bench(
	"index allows (zod)",
	() => Index.zod.safeParse(indexData).success
).median()

bench("index allows (valibot)", () => v.is(Index.valibot, indexData)).median()

bench("index parse (arktype)", () => Index.arktype(indexData)).median()

bench("index parse (zod)", () => Index.zod.safeParse(indexData)).median()

bench("index parse (valibot)", () =>
	v.safeParse(Index.valibot, indexData)
).median()

bench("date allows (arktype)", () => Dated.arktype.allows(datedData)).median()

bench(
	"date allows (zod)",
	() => Dated.zod.safeParse(datedData).success
).median()

bench("date allows (valibot)", () => v.is(Dated.valibot, datedData)).median()

bench("date parse (arktype)", () => Dated.arktype(datedData)).median()

bench("date parse (zod)", () => Dated.zod.safeParse(datedData)).median()

bench("date parse (valibot)", () =>
	v.safeParse(Dated.valibot, datedData)
).median()

bench("morph parse (arktype)", () => Morph.arktype(morphData)).median()

bench("morph parse (zod)", () => Morph.zod.safeParse(morphData)).median()

bench("morph parse (valibot)", () =>
	v.safeParse(Morph.valibot, morphData)
).median()

bench("object morph parse (arktype)", () =>
	ObjectMorph.arktype(objectMorphData)
).median()

bench("object morph parse (zod)", () =>
	ObjectMorph.zod.safeParse(objectMorphData)
).median()

bench("object morph parse (valibot)", () =>
	v.safeParse(ObjectMorph.valibot, objectMorphData)
).median()

bench("defaults parse (arktype)", () => Defaults.arktype(defaultsData)).median()

bench("defaults parse (zod)", () =>
	Defaults.zod.safeParse(defaultsData)
).median()

bench("defaults parse (valibot)", () =>
	v.safeParse(Defaults.valibot, defaultsData)
).median()

bench("nested defaults parse (arktype)", () =>
	NestedDefaults.arktype(nestedDefaultsData)
).median()

bench("nested defaults parse (zod)", () =>
	NestedDefaults.zod.safeParse(nestedDefaultsData)
).median()

bench("nested defaults parse (valibot)", () =>
	v.safeParse(NestedDefaults.valibot, nestedDefaultsData)
).median()

bench("tree allows (arktype)", () => Tree.arktype.allows(treeData)).median()

bench("tree allows (zod)", () => Tree.zod.safeParse(treeData).success).median()

bench("tree allows (valibot)", () => v.is(Tree.valibot, treeData)).median()

bench("tree parse (arktype)", () => Tree.arktype(treeData)).median()

bench("tree parse (zod)", () => Tree.zod.safeParse(treeData)).median()

bench("tree parse (valibot)", () =>
	v.safeParse(Tree.valibot, treeData)
).median()

bench("string allows (arktype)", () => Str.arktype.allows(stringData)).median()

bench(
	"string allows (zod)",
	() => Str.zod.safeParse(stringData).success
).median()

bench("string allows (valibot)", () => v.is(Str.valibot, stringData)).median()

bench("string parse (arktype)", () => Str.arktype(stringData)).median()

bench("string parse (zod)", () => Str.zod.safeParse(stringData)).median()

bench("string parse (valibot)", () =>
	v.safeParse(Str.valibot, stringData)
).median()
