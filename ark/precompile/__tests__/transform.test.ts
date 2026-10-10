import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	createNodeHost,
	precompileModule,
	Precompiler,
	renderDiagnostic
} from "@ark/precompile"
import { scope, type } from "arktype"
import { readFileSync } from "node:fs"
import { memoryHost, precompile } from "./utils.ts"

contextualize(() => {
	describe("standalone", () => {
		it("folds sites to validators", () => {
			const result = precompile(`import { type, ArkErrors } from "arktype"
const max = 64
export const User = type({ name: \`string <= \${max}\` })
export const Same = type({ name: "string <= 64" })
export const Users = User.array()
export const isError = (data: unknown) => data instanceof ArkErrors`)
			attest(result.code).snap(`import { ArkErrors } from "arktype"
import { v1grlzk90j47l5r as $arkv1grlzk90j47l5r } from "~arktype/1szbf1x18h2hgc"
import { vcq9fbr09xh5h7 as $arkvcq9fbr09xh5h7 } from "~arktype/1szbf1x18h2hgc"
import { vcbtdhu09o4jaz as $arkvcbtdhu09o4jaz } from "~arktype/1szbf1x18h2hgc"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
const max = 64
$arkfixConfig()
export const User = /* @__PURE__ */ $arkv1grlzk90j47l5r()
export const Same = /* @__PURE__ */ $arkvcq9fbr09xh5h7()
export const Users = /* @__PURE__ */ $arkvcbtdhu09o4jaz()
export const isError = (data: unknown) => data instanceof ArkErrors`)
			attest(Object.keys(result.modules)).snap([
				"~arktype/1szbf1x18h2hgc",
				"~arktype/entry1gjaofb1ggpkhb",
				"~arktype/meta1ylmjzy0vzxuhi",
				"~arktype/copy31putf1yz3c5u",
				"~arktype/domainbcg75e01r23h7",
				"~arktype/meta8jdijp0ak6zol",
				"~arktype/domain1e538rs0wc05np",
				"~arktype/meta13k1xpv1t1c194",
				"~arktype/copyr7igwt0vxgo5c",
				"~arktype/intersectionm87qy20os6p63",
				"~arktype/meta18aiueg04v7go5",
				"~arktype/meta1mu8wcj0vy3917",
				"~arktype/copyfyolon01lvuko",
				"~arktype/intersectionvgctxr0kwnuhv",
				"~arktype/expression1clepeu1ol8zo0",
				"~arktype/meta1yky3nx1jqc5o1",
				"~arktype/validatorv8yh7t01knfg9",
				"~arktype/metazf1jcb0nbu7la",
				"~arktype/copy1ocz54x1nh7f8j",
				"~arktype/proto1e1te5201bj66w",
				"~arktype/intersection2mb8r13qwyfr",
				"~arktype/expression2zvwda10yflih",
				"~arktype/meta6huo9n0ailrym",
				"~arktype/validator1s53x5p1nayafp",
				"~arktype/1c1qm3a0f4lqlh"
			])
			attest(result.map?.sources).equals(["/main.ts"])
		})

		it("loads arktype where it was imported", () => {
			attest(
				precompile(`import "./polyfill.ts"
import { type, scope as $ } from "arktype"
import * as config from "./config.ts"
export const A = type("string")`).code
			).snap(`import "./polyfill.ts"
import "arktype"
import { v62gs0h1rkzfa4 as $arkv62gs0h1rkzfa4 } from "~arktype/1bqp2mj15euil2"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import * as config from "./config.ts"
$arkfixConfig()
export const A = /* @__PURE__ */ $arkv62gs0h1rkzfa4()`)
		})

		it("unsupported sites", () => {
			const result = precompile(
				`import { type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const field = (n: number) => type(\`string <= \${n}\`)
export const A = type("string").pipe(trim)
export const B = type(\`string <= \${max}\`)
export const C = field(5)
export const D = type("strin")
export const E = type({ "+": "delete", "[string]": "string", a: "'a'" })
export const F = type("number")
export const G = type("string").equals("string")
export const H = type("string").description`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:8:18  type(\"strin\") throws a ParseError\n  'strin' is unresolvable\n  The precompiled site throws the same ParseError when it is created.",
				'/main.ts:9:18  type({ "+": "delete", "[string]": "string", a: "\'a\'" }) can\'t be precompiled to a standalone validator yet\n  structure { [string]: string, a: "a", + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:11:18  type("string").equals("string") can\'t be precompiled to a standalone validator yet\n  its value is not a Type, Module, Scope or Generic\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { type } from "arktype"
import { fa7m7wf09pf4az as $arkfa7m7wf09pf4az } from "~arktype/1hf2bl70br4u8c"
import { f1mgbeg1hlx5g1 as $arkf1mgbeg1hlx5g1 } from "~arktype/1hf2bl70br4u8c"
import { v1clwekn1s6e3gq as $arkv1clwekn1s6e3gq } from "~arktype/1hf2bl70br4u8c"
import { v1yj8wer0ou42kq as $arkv1yj8wer0ou42kq } from "~arktype/1hf2bl70br4u8c"
import { vzonxq00imvowq as $arkvzonxq00imvowq } from "~arktype/1hf2bl70br4u8c"
import $ark1sve6ft0pa6e4h from "~arktype/xuhdp21syk96k"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const field = (n: number) => type(\`string <= \${n}\`)
$arkfixConfig()
export const A = /* @__PURE__ */ $arkfa7m7wf09pf4az(trim)
export const B = /* @__PURE__ */ $arkf1mgbeg1hlx5g1(max)
export const C = /* @__PURE__ */ $arkv1clwekn1s6e3gq()
export const D = $ark1sve6ft0pa6e4h()
export const E = type({ "+": "delete", "[string]": "string", a: "'a'" })
export const F = /* @__PURE__ */ $arkv1yj8wer0ou42kq()
export const G = type("string").equals("string")
export const H = $arkvzonxq00imvowq().description`)
		})

		it("folds Modules", () => {
			const result = precompile(`import { scope, type } from "arktype"
export const types = scope({ tree: { value: "number", "children?": "tree[]" } }).export()
export const M = type.module({ a: "string", b: { c: "a" } })`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { vsjkdln005ypg0 as $arkvsjkdln005ypg0 } from "~arktype/5agb2y06m9dst"
import { vuorrac1fkpkl6 as $arkvuorrac1fkpkl6 } from "~arktype/5agb2y06m9dst"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
$arkfixConfig()
export const types = /* @__PURE__ */ $arkvsjkdln005ypg0()
export const M = /* @__PURE__ */ $arkvuorrac1fkpkl6()`)
			attest(
				Object.values(result.modules)[0]
					.split("\n")
					.filter(line => /^const module\d/.test(line))
			).snap([
				'const module0 = runtime.freeze({ ["tree"]: validator0 })',
				'const module0 = runtime.freeze({ ["a"]: validator0, ["b"]: validator1 })'
			])
		})

		it("folds Scopes and Generics to values whose members throw", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ tree: { value: "number", "children?": "tree[]" }, "box<t>": { box: "t" } })
export const types = $.export()
export const Tree = $.type("tree")
export const Box = type("<t>", { box: "t" })
export const BoxedTree = Box(types.tree)`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { vq7pa6c00qqwz6 as $arkvq7pa6c00qqwz6 } from "~arktype/pgtqtw1fcibqb"
import { v1mrbczv1xkyq28 as $arkv1mrbczv1xkyq28 } from "~arktype/pgtqtw1fcibqb"
import { vcbtdhu09o4jaz as $arkvcbtdhu09o4jaz } from "~arktype/pgtqtw1fcibqb"
import { vb8723u0smnev1 as $arkvb8723u0smnev1 } from "~arktype/pgtqtw1fcibqb"
import { v1tryxgh0tpn3pk as $arkv1tryxgh0tpn3pk } from "~arktype/pgtqtw1fcibqb"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
$arkfixConfig()
const $ = /* @__PURE__ */ $arkvq7pa6c00qqwz6()
export const types = /* @__PURE__ */ $arkv1mrbczv1xkyq28()
export const Tree = /* @__PURE__ */ $arkvcbtdhu09o4jaz()
export const Box = /* @__PURE__ */ $arkvb8723u0smnev1()
export const BoxedTree = /* @__PURE__ */ $arkv1tryxgh0tpn3pk()`)
			attest(
				Object.values(result.modules)[0]
					.split("\n")
					.filter(line => /^const (unavailable|module)\d/.test(line))
			).snap([
				'const unavailable0 = runtime.unavailableScope("the Scope at /main.ts:2:11")',
				'const unavailable0 = runtime.unavailableGeneric("the Generic box at /main.ts:3:22")',
				'const module0 = runtime.freeze({ ["tree"]: validator0, ["box"]: unavailable0 })',
				'const unavailable0 = runtime.unavailableGeneric("the Generic at /main.ts:5:20")'
			])
		})

		it("drops a site written inside a Scope it folds", () => {
			const result = precompile(`import { scope } from "arktype"
const create = () => {
	const $ = scope({ a: () => $.type("string") })
	const types = $.export()
	return types
}`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { f1bev4io0lhnrds as $arkf1bev4io0lhnrds } from "~arktype/1p6l3fa145un97"
import { f17s8udm1bx77ds as $arkf17s8udm1bx77ds } from "~arktype/1p6l3fa145un97"
const create = () => {
	const $ = $arkf1bev4io0lhnrds()
	const types = $arkf17s8udm1bx77ds()
	return types
}`)
		})

		it("folds to a factory what arktype creates anew each time a function runs", () => {
			const result = precompile(`import { scope, type } from "arktype"
export const make = () => ({
	$: scope({ a: "string" }),
	types: type.module({ a: "string" }),
	Box: type("<t>", { box: "t" }),
	Trimmed: type("string.trim"),
	Text: type("string")
})`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { f1a6evaf1ilxqcd as $arkf1a6evaf1ilxqcd } from "~arktype/196aag31u50v6j"
import { f14gb4ky1hqquxy as $arkf14gb4ky1hqquxy } from "~arktype/196aag31u50v6j"
import { f1fqowp70udipzn as $arkf1fqowp70udipzn } from "~arktype/196aag31u50v6j"
import { f1isbncu11it64l as $arkf1isbncu11it64l } from "~arktype/196aag31u50v6j"
import { vr49tao0yiilut as $arkvr49tao0yiilut } from "~arktype/196aag31u50v6j"
export const make = () => ({
	$: $arkf1a6evaf1ilxqcd(),
	types: $arkf14gb4ky1hqquxy(),
	Box: $arkf1fqowp70udipzn(),
	Trimmed: $arkf1isbncu11it64l(),
	Text: $arkvr49tao0yiilut()
})`)
		})

		it("folds to a factory what arktype creates anew each time a loop's body or an instance's field runs", () => {
			const result = precompile(`import { scope } from "arktype"
const made: unknown[] = []
for (let $ = scope({ a: "string" }), i = 0; i < 2; i++)
	made.push($.type("a"), scope({ b: "string" }))
class Holder {
	static shared = scope({ a: "string" })
	own = scope({ a: "string" })
}`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { veq2llt0aejyl2 as $arkveq2llt0aejyl2 } from "~arktype/i14fh71pbultg"
import { v1hn2e10012161b as $arkv1hn2e10012161b } from "~arktype/i14fh71pbultg"
import { f1fqowp70udipzn as $arkf1fqowp70udipzn } from "~arktype/i14fh71pbultg"
import { vd4uuz90f9hzi3 as $arkvd4uuz90f9hzi3 } from "~arktype/i14fh71pbultg"
import { f1ltp2ba0zx2cit as $arkf1ltp2ba0zx2cit } from "~arktype/i14fh71pbultg"
const made: unknown[] = []
for (let $ = $arkveq2llt0aejyl2(), i = 0; i < 2; i++)
	made.push($arkv1hn2e10012161b(), $arkf1fqowp70udipzn())
class Holder {
	static shared = $arkvd4uuz90f9hzi3()
	own = $arkf1ltp2ba0zx2cit()
}`)
		})

		it("leaves a define call's argument in its place", () => {
			const result = precompile(`import { define, scope, type } from "arktype"
const trim = (s: string) => s.trim()
export const A = define({ a: "string" })
export const B = scope({ a: "string" }).define(["a[]", "=>", trim])
export const C = type.define({ c: type("string") })`)
			attest(result.code).snap(`import { type } from "arktype"
const trim = (s: string) => s.trim()
export const A = ({ a: "string" })
export const B = (["a[]", "=>", trim])
export const C = type.define({ c: type("string") })`)
			attest(result.diagnostics.map(d => d.line)).equals([5])
		})
	})

	describe("factories", () => {
		it("folds a site holding functions to a factory call passed them in place", () => {
			const source = `import { type } from "arktype"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
export const Name = type("string").pipe(trim).narrow((s, ctx) => s.length > 0)
export const User = type({ name: Name, pet: type.instanceOf(Pet), [petTag]: "string" })
export const Either = type("string").pipe(trim).or(type("number").pipe(trim))
export const Extended = type("string").pipe(ext)
export const Pair = type([Name, Either])
export const Short = Name.narrow(s => s.length < 9)
export const Stamped = type({ at: ["Date", "=", () => new Date()] })
class Kitten extends Pet {}
export const Kept = type.instanceOf(Pet).and(type.instanceOf(Kitten))`
			// a hole is registered by a name from its module and position, which no other test shares
			const result = precompileModule(
				source,
				"/factories.ts",
				memoryHost({
					"/factories.ts": source,
					"/ext.ts": "export const ext = (s: string) => s"
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(result.code).snap(`import "arktype"
import { f1h9lain030c2md as $arkf1h9lain030c2md } from "~arktype/sbitqn1n1z34x"
import { f1uczdsm0f1mhaw as $arkf1uczdsm0f1mhaw } from "~arktype/sbitqn1n1z34x"
import { fadtawc0az5hrt as $arkfadtawc0az5hrt } from "~arktype/sbitqn1n1z34x"
import { f1xt3f6o16uszem as $arkf1xt3f6o16uszem } from "~arktype/sbitqn1n1z34x"
import { f1nojioh0bjqrvh as $arkf1nojioh0bjqrvh } from "~arktype/sbitqn1n1z34x"
import { f1okx6ql1wtv9z7 as $arkf1okx6ql1wtv9z7 } from "~arktype/sbitqn1n1z34x"
import { faot5y01xoc4hs as $arkfaot5y01xoc4hs } from "~arktype/sbitqn1n1z34x"
import { fuz78vg0xn6j6v as $arkfuz78vg0xn6j6v } from "~arktype/sbitqn1n1z34x"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
$arkfixConfig()
export const Name = /* @__PURE__ */ $arkf1h9lain030c2md(trim, (s, ctx) => s.length > 0)
export const User = /* @__PURE__ */ $arkf1uczdsm0f1mhaw(Name, Pet, petTag)
export const Either = /* @__PURE__ */ $arkfadtawc0az5hrt(trim)
export const Extended = /* @__PURE__ */ $arkf1xt3f6o16uszem(ext)
export const Pair = /* @__PURE__ */ $arkf1nojioh0bjqrvh(Name, Either)
export const Short = /* @__PURE__ */ $arkf1okx6ql1wtv9z7(Name, s => s.length < 9)
export const Stamped = /* @__PURE__ */ $arkfaot5y01xoc4hs(() => new Date())
class Kitten extends Pet {}
export const Kept = /* @__PURE__ */ $arkfuz78vg0xn6j6v(Pet, Kitten)`)
		})

		it("passes the inputs a site reads after its holes", () => {
			const source = `import { type } from "arktype"
import { max } from "./limits.ts"
import { reboxed } from "./reboxed.ts"
import { shape } from "./shapes.ts"
import * as limits from "./limits.ts"
const trim = (s: string) => s.trim()
const o = { name: "string", tags: ["string"] }
const alias = o
export const Local = type({ name: o.name }).pipe(trim)
export const Imported = type(\`string <= \${limits.max}\`).or({ tags: o.tags })
export const Added = type({ ...reboxed })
export const Defined = type(process.env.NODE_ENV === "production" ? "string" : "number")
export const Namespaced = type({ ...limits.boxed })
const box = shape
export const Imports = ((shape: number) => type({ ...box }))(1)
export const Shadowed = (() => {
	const o = 1
	return type(alias.name)
})()`
			const result = precompileModule(
				source,
				"/inputs.ts",
				memoryHost({
					"/inputs.ts": source,
					"/limits.ts":
						'export const max = 5\nexport const boxed = { a: "string" }',
					"/shapes.ts": 'export const shape = { a: "number" }',
					"/reboxed.ts":
						'import { boxed } from "./limits.ts"\nexport const reboxed = boxed'
				}),
				{ define: { "process.env.NODE_ENV": "production" } }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/inputs.ts:18:9  type(alias.name) can't be precompiled to a standalone validator yet\n  `o` (/inputs.ts:7:7) is shadowed where the site is written, so its factory can't receive it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(result.code).snap(`import { type } from "arktype"
import { f1pndslh1lfvnd2 as $arkf1pndslh1lfvnd2 } from "~arktype/1tn3ysw1q3zclz"
import { fcoobse1hdwpxv as $arkfcoobse1hdwpxv } from "~arktype/1tn3ysw1q3zclz"
import { fs5mhm20oegtat as $arkfs5mhm20oegtat } from "~arktype/1tn3ysw1q3zclz"
import { fwuycaw1jorjbe as $arkfwuycaw1jorjbe } from "~arktype/1tn3ysw1q3zclz"
import { f18h70z31d8anaf as $arkf18h70z31d8anaf } from "~arktype/1tn3ysw1q3zclz"
import { fhpkoym15zgexb as $arkfhpkoym15zgexb } from "~arktype/1tn3ysw1q3zclz"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { max } from "./limits.ts"
import { reboxed } from "./reboxed.ts"
import { shape } from "./shapes.ts"
import * as limits from "./limits.ts"
const trim = (s: string) => s.trim()
const o = { name: "string", tags: ["string"] }
const alias = o
$arkfixConfig()
export const Local = /* @__PURE__ */ $arkf1pndslh1lfvnd2(trim, o)
export const Imported = /* @__PURE__ */ $arkfcoobse1hdwpxv(max, o)
export const Added = /* @__PURE__ */ $arkfs5mhm20oegtat(reboxed)
export const Defined = /* @__PURE__ */ $arkfwuycaw1jorjbe(process.env.NODE_ENV)
export const Namespaced = /* @__PURE__ */ $arkf18h70z31d8anaf(limits.boxed)
const box = shape
export const Imports = ((shape: number) => $arkfhpkoym15zgexb($arki1rnr3cp0ewvqsd, box))(1)
export const Shadowed = (() => {
	const o = 1
	return type(alias.name)
})()
import { shape as $arki1rnr3cp0ewvqsd } from "./shapes.ts"`)
		})

		it("reports a ParseError site holding functions", () => {
			const source = `import { scope, type } from "arktype"
import { extend } from "./extend.ts"
const isZero = (n: number) => n === 0
class Cat {}
class Dog {}
extend(Dog, Cat)
export const Narrowed = type("1").narrow(isZero)
export const Anonymous = type("1").narrow(n => n === 0)
export const Both = type.instanceOf(Dog).and(type.instanceOf(Cat))
export const Unrelated = type("1").and("2")
const isNegative = (n: number) => n < 0
const Negative = type("number").narrow(isNegative)
const DogT = type.instanceOf(Dog)
const CatT = type.instanceOf(Cat)
const fns = { f: (s: string) => s.length, g: (s: string) => s.trim() }
const M1 = type({ a: type("string").pipe(fns.f) })
const M2 = type({ a: type("string").pipe(fns.g) })
export const Referenced = type("1").and(Negative)
export const BothReferenced = DogT.and(CatT)
export const Morphs = M1.and(M2)
const negative = () => Negative
const dog = () => DogT
export const Helped = type("1").and(negative())
export const HelpedClass = type.instanceOf(Error).and(dog())
export const Scoped = scope({ a: DogT, b: "a & Error" }).export()
export const Props = type("number").props
export const NarrowedProps = type("number").narrow(isNegative).props`
			const result = precompileModule(
				source,
				"/thrower.ts",
				memoryHost({
					"/thrower.ts": source,
					"/extend.ts":
						"export const extend = (c: Function, base: Function) => Object.setPrototypeOf(c.prototype, base.prototype)"
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/thrower.ts:7:25  type("1").narrow(isZero) can\'t be precompiled to a standalone validator yet\n  arktype calls `isZero` (/thrower.ts:7:42)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/thrower.ts:8:26  type("1").narrow(n => n === 0) can\'t be precompiled to a standalone validator yet\n  arktype calls `n => n === 0` (/thrower.ts:8:43)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:9:21  type.instanceOf(Dog).and(type.instanceOf(Cat)) can't be precompiled to a standalone validator yet\n  arktype holds `Dog` (/thrower.ts:9:37)\n  arktype holds `Cat` (/thrower.ts:9:62)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:10:26  type("1").and("2") throws a ParseError\n  Intersection of 1 and 2 results in an unsatisfiable type\n  The precompiled site throws the same ParseError when it is created.',
				'/thrower.ts:18:27  type("1").and(Negative) can\'t be precompiled to a standalone validator yet\n  arktype is passed a value holding `isNegative` (/thrower.ts:11:20)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:19:31  DogT.and(CatT) can't be precompiled to a standalone validator yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  arktype is passed a value holding `Cat` (/thrower.ts:4:1)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				"/thrower.ts:20:23  M1.and(M2) can't be precompiled to a standalone validator yet\n  arktype is passed a value holding `f` (/thrower.ts:15:18)\n  arktype is passed a value holding `g` (/thrower.ts:15:46)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:23:23  type("1").and(negative()) can\'t be precompiled to a standalone validator yet\n  arktype is passed a value holding `isNegative` (/thrower.ts:11:20)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:24:28  type.instanceOf(Error).and(dog()) can't be precompiled to a standalone validator yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:25:23  scope({ a: DogT, b: "a & Error" }).export() can\'t be precompiled to a standalone validator yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/thrower.ts:26:22  type("number").props throws a ParseError\n  props operand must be an object (was number)\n  The precompiled site throws the same ParseError when it is created.',
				'/thrower.ts:27:30  type("number").narrow(isNegative).props can\'t be precompiled to a standalone validator yet\n  arktype calls `isNegative` (/thrower.ts:27:52)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { scope, type } from "arktype"
import $arkhhfme10rgsm2a from "~arktype/in37f40k9qr2u"
import { fi32fv11rij4as as $arkfi32fv11rij4as } from "~arktype/11jetmy16jg0n9"
import { fge601l1l8djke as $arkfge601l1l8djke } from "~arktype/11jetmy16jg0n9"
import { f15on17z0md0pi6 as $arkf15on17z0md0pi6 } from "~arktype/11jetmy16jg0n9"
import { f1rkl43l16h747g as $arkf1rkl43l16h747g } from "~arktype/11jetmy16jg0n9"
import { fk4dreo1vs7gyk as $arkfk4dreo1vs7gyk } from "~arktype/11jetmy16jg0n9"
import $arkrhchbs1xkut83 from "~arktype/o94jis1u2oxph"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { extend } from "./extend.ts"
const isZero = (n: number) => n === 0
class Cat {}
class Dog {}
extend(Dog, Cat)
export const Narrowed = type("1").narrow(isZero)
export const Anonymous = type("1").narrow(n => n === 0)
export const Both = type.instanceOf(Dog).and(type.instanceOf(Cat))
export const Unrelated = $arkhhfme10rgsm2a()
const isNegative = (n: number) => n < 0
$arkfixConfig()
const Negative = /* @__PURE__ */ $arkfi32fv11rij4as(isNegative)
const DogT = /* @__PURE__ */ $arkfge601l1l8djke(Dog)
const CatT = /* @__PURE__ */ $arkf15on17z0md0pi6(Cat)
const fns = { f: (s: string) => s.length, g: (s: string) => s.trim() }
const M1 = /* @__PURE__ */ $arkf1rkl43l16h747g(fns.f)
const M2 = /* @__PURE__ */ $arkfk4dreo1vs7gyk(fns.g)
export const Referenced = type("1").and(Negative)
export const BothReferenced = DogT.and(CatT)
export const Morphs = M1.and(M2)
const negative = () => Negative
const dog = () => DogT
export const Helped = type("1").and(negative())
export const HelpedClass = type.instanceOf(Error).and(dog())
export const Scoped = scope({ a: DogT, b: "a & Error" }).export()
export const Props = $arkrhchbs1xkut83()
export const NarrowedProps = type("number").narrow(isNegative).props`)
			attest(result.modules["~arktype/16ceueuzjpy"]).snap(undefined)
		})

		it("checks the static helpers another module exports in a test driver", () => {
			const source = `import { type } from "arktype"
import single, { list } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const own = (def: string) => list(def)
export const List = type(list("string"))
export const Own = type(own("number"))
export const Optional = type(helpers.optional("string"))
export const Single = type(single("string"))`
			const files = {
				"/checked.ts": source,
				"/helpers.ts": `import { suffix } from "./suffix.ts"
const base = (def: string) => \`\${def}[]\`
export const list = (def: string) => base(def)
export const optional = (def: string) => suffix(def, " | undefined")
export default (def: string) => def`,
				"/suffix.ts":
					"export const suffix = (def: string, s: string) => def + s"
			}
			const build = (id: keyof typeof files, checkHelpers: boolean) =>
				precompileModule(files[id], id, memoryHost(files), { checkHelpers })
			// a bundle runs the helpers the build read
			attest(build("/checked.ts", false).diagnostics).equals([])
			const checked = build("/checked.ts", true)
			attest(checked.diagnostics.map(renderDiagnostic)).snap([
				"/checked.ts:8:23  type(single(\"string\")) can't be precompiled to a standalone validator yet\n  `default` (/helpers.ts:5:16) is a static helper its module doesn't export through a binding, so a test driver can't register it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(checked.code).snap(`import { type } from "arktype"
import { f13yfk091jb2s9c as $arkf13yfk091jb2s9c } from "~arktype/1612dxg0slbfdy"
import { f1mgbeg1hlx5g1 as $arkf1mgbeg1hlx5g1 } from "~arktype/1612dxg0slbfdy"
import { f1t2p9ht1hshs19 as $arkf1t2p9ht1hshs19 } from "~arktype/1612dxg0slbfdy"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import single, { list } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const own = (def: string) => list(def)
$arkfixConfig()
export const List = /* @__PURE__ */ $arkf13yfk091jb2s9c(list)
export const Own = /* @__PURE__ */ $arkf1mgbeg1hlx5g1(list)
export const Optional = /* @__PURE__ */ $arkf1t2p9ht1hshs19(helpers.optional, $arkinfk34400tx9ll)
export const Single = type(single("string"))
import { suffix as $arkinfk34400tx9ll } from "./suffix.ts"`)
			attest(build("/helpers.ts", true).code)
				.snap(`import { suffix } from "./suffix.ts"
const base = (def: string) => \`\${def}[]\`
export const list = (def: string) => base(def)
export const optional = (def: string) => suffix(def, " | undefined")
export default (def: string) => def
Object.assign((globalThis[Symbol.for("arktype.helpers")] ??= { __proto__: null }), { "/helpers.ts": { __proto__: null, "list": list, "optional": optional } })`)
		})

		it("passes a hole through each text reading it", () => {
			const result = precompile(
				`import { type } from "arktype"
import { a } from "./a.ts"
import { alias } from "./b.ts"
const fns = { check: (s: string) => s.length > 3 }
const other = { check: fns.check }
const Name = type("string").narrow(fns.check)
export const Aliased = type("string").pipe(a).or(type("number").pipe(alias))
export const Checked = type({ a: type("string").narrow(other.check), b: type("string").narrow(fns.check), name: Name })`,
				{
					"/a.ts": "export const a = (s: string) => s",
					"/b.ts": 'export { a as alias } from "./a.ts"'
				}
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(result.code).snap(`import "arktype"
import { f1c4gvm01nuxz5 as $arkf1c4gvm01nuxz5 } from "~arktype/46yk470aknrkl"
import { fos9smi09rf17b as $arkfos9smi09rf17b } from "~arktype/46yk470aknrkl"
import { fel68or0or1ja7 as $arkfel68or0or1ja7 } from "~arktype/46yk470aknrkl"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { a } from "./a.ts"
import { alias } from "./b.ts"
const fns = { check: (s: string) => s.length > 3 }
const other = { check: fns.check }
$arkfixConfig()
const Name = /* @__PURE__ */ $arkf1c4gvm01nuxz5(fns.check)
export const Aliased = /* @__PURE__ */ $arkfos9smi09rf17b(a, alias)
export const Checked = /* @__PURE__ */ $arkfel68or0or1ja7(other.check, fns.check, Name)`)
			attest(
				result.modules[Object.keys(result.modules)[0]].match(
					/runtime\.checkIdentity\(.*\)/g
				)
			).snap([
				'runtime.checkIdentity(p1, p0, "`alias` (/main.ts:7:70)", "`a` (/main.ts:7:44)")',
				'runtime.checkIdentity(p1, p0, "`fns.check` (/main.ts:8:95)", "`other.check` (/main.ts:8:56)")',
				'runtime.checkIdentity(holes1[0], p0, "`Name`\'s hole 0", "`other.check` (/main.ts:8:56)")'
			])
		})

		it("unsupported sites", () => {
			const result = precompile(
				`import { type } from "arktype"
import { a } from "./a.ts"
import { b, alias } from "./b.ts"
export const Both = type("string").pipe(a, b)
class Foo {}
export const Deleted = type({ "+": "delete", "[string]": "string", a: type.instanceOf(Foo).or("string") })`,
				{
					"/a.ts": "export const a = (s: string) => s",
					"/b.ts":
						'export const b = (s: string) => s\nexport { a as alias } from "./a.ts"'
				}
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:4:21  type("string").pipe(a, b) can\'t be precompiled to a standalone validator yet\n  `a` and `b` may hold the same value at runtime, which the site\'s output depends on\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:6:24  type({ "+": "delete", "[string]": "string", a: type.instanc… can\'t be precompiled to a standalone validator yet\n  structure { [string]: string, a: string | Foo, + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
		})

		it("passes a Type where a site reads a member a standalone validator doesn't have", () => {
			const result = precompile(
				`import { type } from "arktype"
const tag = Symbol("tag")
const T = type({ [tag]: "0" }).or({ [tag]: "1" })
export const Union = T.internal.assertHasKind("union")
export const In = type({ a: T.in })`
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(result.code).snap(`import "arktype"
import { f1bg5ghg1udq2qc as $arkf1bg5ghg1udq2qc } from "~arktype/pz6w8w0xaoqdh"
import { fnlxeht0j9hv9h as $arkfnlxeht0j9hv9h } from "~arktype/pz6w8w0xaoqdh"
import { fe5h3530tuatax as $arkfe5h3530tuatax } from "~arktype/pz6w8w0xaoqdh"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
const tag = Symbol("tag")
$arkfixConfig()
const T = /* @__PURE__ */ $arkf1bg5ghg1udq2qc(tag)
export const Union = /* @__PURE__ */ $arkfnlxeht0j9hv9h(T)
export const In = /* @__PURE__ */ $arkfe5h3530tuatax(T)`)
		})

		it("passes a read only through a text meaning the same at the site", () => {
			const result = precompile(
				`import { type } from "arktype"
const isLong = (s: string) => s.length > 1
const isShort = (s: string) => s.length < 3
const h = isLong
const fns = { isLong }
const shorts = () => [isShort]
const Long = type("string").narrow(isLong)
const N = type("string").narrow(isShort)
const longs = () => [Long]
export const Mapped = type([isLong].map(h => type("string").narrow(h)) as never)
export const Shadowed = type([type("string").narrow(h), ...shorts().map(h => type("string").narrow(h))] as never)
export const Renamed = type(Object.values(fns).map(h => type("string").narrow(h)) as never)
export const Through = type(longs().map(N => type({ n: N })) as never)
export const Either = type(shorts().map(h => type("string").narrow(h || isLong)) as never)
export const Own = type("string").narrow(function (this: unknown, s) { return s.length > 1 && !this })
export const OwnFirst = type("string").narrow(function (this: unknown, s) { return this === undefined && s.length > 1 })`
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:11:25  type([type("string").narrow(h), ...shorts().map(h => type("… can\'t be precompiled to a standalone validator yet\n  arktype holds `(s: string) => s.length < 3` (/main.ts:3:17), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:12:24  type(Object.values(fns).map(h => type("string").narrow(h)) … can\'t be precompiled to a standalone validator yet\n  arktype holds `(s: string) => s.length > 1` (/main.ts:2:16), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/main.ts:13:24  type(longs().map(N => type({ n: N })) as never) can't be precompiled to a standalone validator yet\n  arktype holds `(s: string) => s.length > 1` (/main.ts:2:16), which the site cannot pass to its factory\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/main.ts:14:23  type(shorts().map(h => type("string").narrow(h || isLong)) … can\'t be precompiled to a standalone validator yet\n  arktype holds `(s: string) => s.length < 3` (/main.ts:3:17), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { type } from "arktype"
import { fgxncna0e0vtuy as $arkfgxncna0e0vtuy } from "~arktype/1wwl3v00o3q7wc"
import { fue93h80tgxvhc as $arkfue93h80tgxvhc } from "~arktype/1wwl3v00o3q7wc"
import { fvuztpd0flqkce as $arkfvuztpd0flqkce } from "~arktype/1wwl3v00o3q7wc"
import { f1pp1bhu1wky3z8 as $arkf1pp1bhu1wky3z8 } from "~arktype/1wwl3v00o3q7wc"
import { f1vcmva31ng9y85 as $arkf1vcmva31ng9y85 } from "~arktype/1wwl3v00o3q7wc"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
const isLong = (s: string) => s.length > 1
const isShort = (s: string) => s.length < 3
const h = isLong
const fns = { isLong }
const shorts = () => [isShort]
$arkfixConfig()
const Long = /* @__PURE__ */ $arkfgxncna0e0vtuy(isLong)
const N = /* @__PURE__ */ $arkfue93h80tgxvhc(isShort)
const longs = () => [Long]
export const Mapped = /* @__PURE__ */ $arkfvuztpd0flqkce(isLong)
export const Shadowed = type([type("string").narrow(h), ...shorts().map(h => type("string").narrow(h))] as never)
export const Renamed = type(Object.values(fns).map(h => type("string").narrow(h)) as never)
export const Through = type(longs().map(N => type({ n: N })) as never)
export const Either = type(shorts().map(h => type("string").narrow(h || isLong)) as never)
export const Own = /* @__PURE__ */ $arkf1pp1bhu1wky3z8(function (this: unknown, s) { return s.length > 1 && !this })
export const OwnFirst = /* @__PURE__ */ $arkf1vcmva31ng9y85(function (this: unknown, s) { return this === undefined && s.length > 1 })`)
		})

		it("passes each function one expression created", () => {
			const result = precompile(
				`import { type } from "arktype"
const longer = (n: number) => (s: string) => s.length > n
export const T = type("string").narrow(longer(3)).narrow(longer(1))`
			)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { farwx4t08ya85o as $arkfarwx4t08ya85o } from "~arktype/qskkz70w7tlvp"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
const longer = (n: number) => (s: string) => s.length > n
$arkfixConfig()
export const T = /* @__PURE__ */ $arkfarwx4t08ya85o(longer(3), longer(1))`)
		})

		it("shares a table between factories arktype returned one Type for", () => {
			const result = precompile(`import { scope, type } from "arktype"
const isLong = (s: string) => s.length > 1
const $1 = scope({ a: "string" })
const $2 = scope({ a: "string" })
const narrowed = (fn: (s: string) => boolean) => type("string").narrow(fn)
export const A = narrowed(isLong)
export const B = narrowed(isLong)
export const C = $1.type("a").narrow(isLong)
export const D = $2.type("a").narrow(isLong)
export const E = $1.type("string").narrow(isLong)
export const fresh = () => scope({ a: "string" }).type("a").narrow(isLong)`)
			const artifact = result.modules[Object.keys(result.modules)[0]]
			// each factory's code ends at its export
			const tables = artifact
				.split(/^export { factory\d+ .*$/m)
				.slice(0, -1)
				.map(code => code.match(/runtime\.intern\(\((interned\d+)/)?.[1])
			attest(tables).equals([
				"interned0",
				"interned0",
				"interned1",
				"interned2",
				"interned1",
				undefined
			])
		})

		it("composes a Type a static helper returns", () => {
			const result = precompile(
				`import { type } from "arktype"
const trim = (s: string) => s.trim()
const A = type({ a: "string" })
const B = type({ b: "number" })
const Trimmed = type({ a: type("string").pipe(trim) })
const first = () => A
const second = () => B
const trimmed = () => Trimmed
export const Both = first().and(second())
export const Held = trimmed().and(second())
const X = first().and(second())
export const Composed = X.or("string")
export const Asserted = trimmed().assert({ a: " x " })
export const Called = trimmed()({ a: " y " })
const loop = (): never => loop().and(B)`
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:10:21  trimmed().and(second()) can't be precompiled to a standalone validator yet\n  arktype holds `(s: string) => s.trim()` (/main.ts:2:14), which the site cannot pass to its factory\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(result.code).snap(`import "arktype"
import { vq10hui17onwk2 as $arkvq10hui17onwk2 } from "~arktype/7ettow16d1mzr"
import { v1oigsr31najz55 as $arkv1oigsr31najz55 } from "~arktype/7ettow16d1mzr"
import { fd9jxkn0kakf0g as $arkfd9jxkn0kakf0g } from "~arktype/7ettow16d1mzr"
import { v112lir714tv8ze as $arkv112lir714tv8ze } from "~arktype/7ettow16d1mzr"
import { vrg81gy0tev40w as $arkvrg81gy0tev40w } from "~arktype/7ettow16d1mzr"
import { vp99ye0097h426 as $arkvp99ye0097h426 } from "~arktype/7ettow16d1mzr"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
const trim = (s: string) => s.trim()
$arkfixConfig()
const A = /* @__PURE__ */ $arkvq10hui17onwk2()
const B = /* @__PURE__ */ $arkv1oigsr31najz55()
const Trimmed = /* @__PURE__ */ $arkfd9jxkn0kakf0g(trim)
const first = () => A
const second = () => B
const trimmed = () => Trimmed
export const Both = /* @__PURE__ */ $arkv112lir714tv8ze()
export const Held = trimmed().and(second())
const X = /* @__PURE__ */ $arkvrg81gy0tev40w()
export const Composed = /* @__PURE__ */ $arkvp99ye0097h426()
export const Asserted = trimmed().assert({ a: " x " })
export const Called = trimmed()({ a: " y " })
const loop = (): never => loop().and(B)`)
		})

		it("shares a Type's code with each module composing it", () => {
			const files = {
				"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`,
				"/team.ts": `import { type } from "arktype"
import { User } from "./user.ts"
export const Team = type({ lead: User })`
			}
			const precompiler = new Precompiler(memoryHost(files))
			const user = precompiler.precompile(files["/user.ts"], "/user.ts")
			const team = precompiler.precompile(files["/team.ts"], "/team.ts")
			const shared = Object.keys(team.modules).filter(
				specifier => user.modules[specifier]
			)
			for (const specifier of shared)
				attest(team.modules[specifier]).equals(user.modules[specifier])
			attest(shared).snap([
				"~arktype/entry1gjaofb1ggpkhb",
				"~arktype/expression8iqvn605rslpf",
				"~arktype/meta1ylmjzy0vzxuhi",
				"~arktype/copy31putf1yz3c5u",
				"~arktype/domainbcg75e01r23h7",
				"~arktype/meta8jdijp0ak6zol",
				"~arktype/domain1e538rs0wc05np",
				"~arktype/metarttxqf0uu0rvh",
				"~arktype/copyfyolon01lvuko",
				"~arktype/intersectionxf7vnb0owa73y",
				"~arktype/meta1mxb3kg1rnydhv",
				"~arktype/1c1qm3a0f4lqlh"
			])
		})

		it("reports a Module whose site reads what only a factory receives", () => {
			const result = precompile(
				`import { type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
export const Held = type.module({ a: ["string", "=>", trim] })
export const Read = type.module({ a: \`string <= \${max}\` })`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:4:21  type.module({ a: ["string", "=>", trim] }) can\'t be precompiled to a standalone validator yet\n  arktype holds `trim` (/main.ts:4:55), which only a Type\'s factory can receive yet\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/main.ts:5:21  type.module({ a: `string <= ${max}` }) can't be precompiled to a standalone validator yet\n  `max` is imported from /limits.ts, which only a Type's factory can compare yet\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
		})
	})

	describe("cache", () => {
		it("imports a table after the module's imports", () => {
			const source = `import { type } from "arktype"
let def = "string"
def = "number"
export const Trimmed = type("string").pipe(s => s.trim())
export const T = type(def)
import { other } from "./other.ts"`
			const result = precompile(
				source,
				{ "/other.ts": "export const other = 1" },
				{ runtime: "arktype" }
			)
			attest(result.code).snap(`import { type } from "arktype"
import "~arktype/units/cdoxxl1u298yq"
let def = "string"
def = "number"
export const Trimmed = type("string").pipe(s => s.trim())
export const T = type(def)
import { other } from "./other.ts"`)
			attest(result.diagnostics.map(d => `${d.rule} ${d.severity}`)).snap([
				"R1 warning"
			])
			attest(Object.values(result.modules)[0].split("\n")[0]).snap(
				'import { registerPrecompiledUnits } from "arktype/internal"'
			)
		})

		it("reads JSX in a .js module", () => {
			const source = `import { type } from "arktype"
export const User = type({ name: "string" })
export const Name = () => <span>name</span>`
			const result = precompileModule(
				source,
				"/main.js",
				memoryHost({ "/main.js": source })
			)
			attest(result.diagnostics.map(renderDiagnostic)).equals([])
			attest(result.code).satisfies(
				/export const User = \/\* @__PURE__ \*\/ \$ark\w+\(\)\n/
			)
		})

		it("leaves a module without sites unchanged", () => {
			const result = precompile(
				`import { type } from "arktype"
export const isError = (data: unknown) => data instanceof type.errors`,
				{},
				{ runtime: "arktype" }
			)
			attest([result.map, result.modules]).equals([undefined, {}])
		})
	})

	describe("inline", () => {
		it("runs each module in a function passed the globals its importer shadows", () => {
			const result = precompile(
				`import { type } from "arktype"
const Array = "shadowed"
export const T = type("string[]")
export const E = type("strng")`,
				{},
				{ inline: true }
			)
			const lines = result.code.split("\n")
			attest([lines[0], ...lines.slice(-12)]).snap([
				"var $ark$exports0;",
				"})($ark$0))",
				"}",
				"function $arkfixConfig(...args) {",
				'return $ark$load2()["default"](...args)',
				"}",
				"$ark$load2();",
				'import "arktype"',
				'import * as $ark$0 from "arktype/runtime"',
				'const Array = "shadowed"',
				"$arkfixConfig()",
				"export const T = /* @__PURE__ */ $arkvezobkc1ju5l1x()",
				"export const E = $arkd7m1yy1v6q065()"
			])
			attest(result.modules).equals({})
		})

		it("registers the keyword table before arktype loads", () => {
			const lines = precompile(
				`import "./config.ts"
import { type } from "arktype"
export const T = type("string[]")`,
				{},
				{ inline: true, runtime: "arktype" }
			).code.split("\n")
			attest([lines[0], ...lines.slice(-6)]).snap([
				';(({ "registerPrecompiledUnits": registerPrecompiledUnits }) => {',
				"})($ark$0);",
				'import "./config.ts"',
				'import "arktype/internal/precompiled.js"',
				'import { type } from "arktype"',
				'import * as $ark$0 from "arktype/internal"',
				'export const T = type("string[]")'
			])
		})
	})

	it("reads which modules may define a Type from their imports", () => {
		const files = {
			"/ark.ts": 'export { type } from "arktype"',
			"/schemas.ts":
				'import { type } from "./ark.ts"\nexport const User = type({ name: "string" })',
			"/helpers.ts":
				'import { type } from "arktype"\nexport const field = (n: number) => type(`string <= ${n}`)',
			"/all.ts": 'export * from "./schemas.ts"',
			"/errors.ts": 'export { ArkErrors } from "arktype"',
			"/check.ts":
				'import { User } from "./schemas.ts"\nexport const isUser = (data: unknown) => User.allows(data)',
			"/math.ts": "export const add = (a: number, b: number) => a + b"
		}
		const precompiler = new Precompiler(memoryHost(files))
		attest(
			Object.keys(files).map(
				file =>
					`${file} ${precompiler.importsArk(`import { x } from ".${file}"`, "/main.ts")}`
			)
		).snap([
			"/ark.ts true",
			"/schemas.ts true",
			"/helpers.ts true",
			"/all.ts true",
			"/errors.ts false",
			"/check.ts false",
			"/math.ts false"
		])
	})

	it("reads which modules may read arktype's nodes from their imports in a standalone build", () => {
		const standalone = new Precompiler(memoryHost({}))
		const cached = new Precompiler(memoryHost({}), { runtime: "arktype" })
		attest(
			[
				'import { discriminantJsonOf } from "arksets"',
				'import { hasArkKind } from "@ark/schema"',
				'import { ArkErrors } from "@ark/schema/runtime"'
			].map(
				source =>
					`${source} ${standalone.importsArk(source, "/helpers.ts")} ${cached.importsArk(source, "/helpers.ts")}`
			)
		).snap([
			'import { discriminantJsonOf } from "arksets" true false',
			'import { hasArkKind } from "@ark/schema" true false',
			'import { ArkErrors } from "@ark/schema/runtime" false false'
		])
	})

	it("keeps sites apart whose Types differ only in their scope's config", () => {
		const { modules } = precompile(`import { scope } from "arktype"
export const Custom = scope({}, { domain: { message: "custom" } }).type({ x: "string" })
export const Default = scope({}).type({ x: "string" })`)
		attest(Object.values(modules)[0].includes('message: "custom"')).equals(true)
	})

	it("writes the same modules in any order after unrelated work", () => {
		const ids = [
			...["main.ts", "dates.ts", "numbers.ts", "local.ts"].map(file =>
				fromHere("environments", file)
			),
			fromHere("app", "main.ts")
		]
		const unrelated = fromHere("app", "admin.ts")
		const build = (order: string[], runtime?: "arktype") => {
			const precompiler = new Precompiler(
				createNodeHost({ conditions: ["ark-ts"] }),
				{ runtime }
			)
			const results = Object.fromEntries(
				order.map(id => [
					id,
					precompiler.precompile(readFileSync(id, "utf8"), id)
				])
			)
			return ids.map(id => [results[id].code, results[id].modules])
		}
		for (const runtime of [undefined, "arktype"] as const) {
			const first = build(ids, runtime)
			for (let i = 0; i < 40; i++) {
				type({ [`k${i}`]: `number > ${i}` })
				type({ value: `number > ${i}`, "next?": "this" })
			}
			const { tree } = scope({
				After: "Date > d'2001-01-01T00:00:00.000Z'",
				tree: { "children?": "tree[]" }
			}).export()
			let deep: unknown = {}
			for (let i = 0; i < 100; i++) deep = { children: [deep] }
			tree(deep)
			attest(build([unrelated, ...[...ids].reverse()], runtime)).equals(first)
		}
	})
})
