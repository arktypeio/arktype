import { bench } from "@ark/attest"
import { noSuggest } from "@ark/util"
import type { ArkErrors, Type } from "arktype"
import { precompileStandalone } from "arktype/internal/standalone.ts"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
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
	Rotating,
	rotatingData,
	Tree,
	treeData
} from "./scenarios.ts"

const out = join(import.meta.dirname, "out")
mkdirSync(out, { recursive: true })
const standalonePath = join(out, "validate.standalone.js")
writeFileSync(
	standalonePath,
	precompileStandalone({
		Moltar: Moltar.arktype,
		MoltarStrict: MoltarStrict.arktype,
		MoltarStrip: MoltarStrip.arktype,
		Product: Product.arktype,
		Items: Items.arktype,
		Patterns: Patterns.arktype,
		Discriminated: Discriminated.arktype,
		Constraints: Constraints.arktype,
		Morph: Morph.arktype,
		Defaults: Defaults.arktype,
		Tree: Tree.arktype,
		...Object.fromEntries(Rotating.map((t, i) => [`Rotating${i}`, t.arktype]))
	})
)

// standalone validators refuse to load beside arktype unless its claim is cleared
delete (globalThis as Record<string, unknown>)[noSuggest("loadedArktypeEntry")]

const standalone: Record<string, Type> = await import(standalonePath)

const standaloneRotating = Rotating.map((_, i) => standalone[`Rotating${i}`])

bench("moltar allows (arktype)", () =>
	Moltar.arktype.allows(moltarData)
).median([8.03, "ns"])

bench("moltar allows (standalone)", () =>
	standalone.Moltar.allows(moltarData)
).median([13.08, "ns"])

bench("moltar allows (valibot)", () => v.is(Moltar.valibot, moltarData)).median(
	[700.18, "ns"]
)

bench("moltar parse (arktype)", () => Moltar.arktype(moltarData)).median([
	10.8,
	"ns"
])

bench("moltar parse (standalone)", () => standalone.Moltar(moltarData)).median([
	18.5,
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

bench("moltar strict allows (standalone)", () =>
	standalone.MoltarStrict.allows(moltarData)
).median([236.06, "ns"])

bench("moltar strict allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarData)
).median([771.32, "ns"])

bench("moltar strict parse (arktype)", () =>
	MoltarStrict.arktype(moltarData)
).median([146.8, "ns"])

bench("moltar strict parse (standalone)", () =>
	standalone.MoltarStrict(moltarData)
).median([229.05, "ns"])

bench("moltar strict parse (zod)", () =>
	MoltarStrict.zod.safeParse(moltarData)
).median([293.82, "ns"])

bench("moltar strict parse (valibot)", () =>
	v.safeParse(MoltarStrict.valibot, moltarData)
).median([925.28, "ns"])

bench("moltar strict invalid allows (arktype)", () =>
	MoltarStrict.arktype.allows(moltarExtraKeysData)
).median([74.41, "ns"])

bench("moltar strict invalid allows (standalone)", () =>
	standalone.MoltarStrict.allows(moltarExtraKeysData)
).median([38.25, "ns"])

bench("moltar strict invalid allows (valibot)", () =>
	v.is(MoltarStrict.valibot, moltarExtraKeysData)
).median([1.18, "us"])

// summary makes arktype compute the messages zod and valibot build eagerly
bench(
	"moltar strict invalid errors (arktype)",
	() => (MoltarStrict.arktype(moltarExtraKeysData) as ArkErrors).summary
).median([4.95, "us"])

bench(
	"moltar strict invalid errors (standalone)",
	() => (standalone.MoltarStrict(moltarExtraKeysData) as ArkErrors).summary
).median([6.85, "us"])

bench(
	"moltar strict invalid errors (zod)",
	() => MoltarStrict.zod.safeParse(moltarExtraKeysData).error!.issues
).median([16.12, "us"])

bench(
	"moltar strict invalid errors (valibot)",
	() => v.safeParse(MoltarStrict.valibot, moltarExtraKeysData).issues
).median([1.47, "us"])

// arktype deletes undeclared keys and adds defaults in place, so each arm parses its own copy
const copiesByArm = <data>(data: data) => ({
	arktype: structuredClone(data),
	standalone: structuredClone(data),
	zod: structuredClone(data),
	valibot: structuredClone(data)
})

const stripDataByArm = copiesByArm(moltarExtraKeysData)

const defaultsDataByArm = copiesByArm(defaultsData)

bench("moltar strip parse (arktype)", () =>
	MoltarStrip.arktype(stripDataByArm.arktype)
).median([39.3, "ns"])

bench("moltar strip parse (standalone)", () =>
	standalone.MoltarStrip(stripDataByArm.standalone)
).median([35.4, "ns"])

bench("moltar strip parse (zod)", () =>
	MoltarStrip.zod.safeParse(stripDataByArm.zod)
).median([349, "ns"])

bench("moltar strip parse (valibot)", () =>
	v.safeParse(MoltarStrip.valibot, stripDataByArm.valibot)
).median([1.61, "us"])

bench("moltar invalid allows (arktype)", () =>
	Moltar.arktype.allows(moltarInvalidData)
).median([5.26, "ns"])

bench("moltar invalid allows (standalone)", () =>
	standalone.Moltar.allows(moltarInvalidData)
).median([10.81, "ns"])

bench("moltar invalid allows (valibot)", () =>
	v.is(Moltar.valibot, moltarInvalidData)
).median([974.94, "ns"])

bench(
	"moltar invalid errors (arktype)",
	() => (Moltar.arktype(moltarInvalidData) as ArkErrors).summary
).median([6.51, "us"])

bench(
	"moltar invalid errors (standalone)",
	() => (standalone.Moltar(moltarInvalidData) as ArkErrors).summary
).median([4.8, "us"])

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

bench("product parse (standalone)", () =>
	standalone.Product(productData)
).median([2.5, "us"])

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
	"product invalid errors (standalone)",
	() => (standalone.Product(productInvalidData) as ArkErrors).summary
).median([47.91, "us"])

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

bench("items parse (standalone)", () => standalone.Items(itemsData)).median([
	676.97,
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
	"items invalid errors (standalone)",
	() => (standalone.Items(itemsInvalidData) as ArkErrors).summary
).median([7.44, "us"])

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
	"patterns invalid errors (standalone)",
	() => (standalone.Patterns(patternsInvalidData) as ArkErrors).summary
).median([64.33, "us"])

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

bench("discriminated parse (standalone)", () =>
	discriminatedData.map(d => standalone.Discriminated(d))
).median([74.25, "ns"])

bench("discriminated parse (zod)", () =>
	discriminatedData.map(d => Discriminated.zod.safeParse(d))
).median([585.27, "ns"])

bench("discriminated parse (valibot)", () =>
	discriminatedData.map(d => v.safeParse(Discriminated.valibot, d))
).median([2.62, "us"])

// one call site validates every type, as a framework's shared validator does
bench("rotating parse (arktype)", () =>
	rotatingData.map((d, i) => Rotating[i].arktype(d))
).median([266.42, "ns"])

bench("rotating parse (standalone)", () =>
	rotatingData.map((d, i) => standaloneRotating[i](d))
).median([166.94, "ns"])

bench("rotating parse (zod)", () =>
	rotatingData.map((d, i) => Rotating[i].zod.safeParse(d))
).median([1.63, "us"])

bench("rotating parse (valibot)", () =>
	rotatingData.map((d, i) => v.safeParse(Rotating[i].valibot, d))
).median([1.96, "us"])

bench("constraints parse (arktype)", () =>
	Constraints.arktype(constraintsData)
).median([80.2, "ns"])

bench("constraints parse (standalone)", () =>
	standalone.Constraints(constraintsData)
).median([141.97, "ns"])

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

bench("morph parse (standalone)", () => standalone.Morph(morphData)).median([
	49.32,
	"ns"
])

bench("morph parse (zod)", () => Morph.zod.safeParse(morphData)).median([
	265,
	"ns"
])

bench("morph parse (valibot)", () =>
	v.safeParse(Morph.valibot, morphData)
).median([117.08, "ns"])

bench("defaults parse (arktype)", () =>
	Defaults.arktype(defaultsDataByArm.arktype)
).median([26.3, "ns"])

bench("defaults parse (standalone)", () =>
	standalone.Defaults(defaultsDataByArm.standalone)
).median([25.8, "ns"])

bench("defaults parse (zod)", () =>
	Defaults.zod.safeParse(defaultsDataByArm.zod)
).median([317.7, "ns"])

bench("defaults parse (valibot)", () =>
	v.safeParse(Defaults.valibot, defaultsDataByArm.valibot)
).median([1.08, "us"])

bench("tree parse (arktype)", () => Tree.arktype(treeData)).median([3.24, "us"])

bench("tree parse (standalone)", () => standalone.Tree(treeData)).median([
	1.45,
	"us"
])

bench("tree parse (zod)", () => Tree.zod.safeParse(treeData)).median([
	3.92,
	"us"
])

bench("tree parse (valibot)", () => v.safeParse(Tree.valibot, treeData)).median(
	[8.38, "us"]
)
