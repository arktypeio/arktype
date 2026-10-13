import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	createNodeHost,
	precompileModule,
	Precompiler,
	renderDiagnostic
} from "@ark/precompile"
import { scope, type } from "arktype"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { memoryHost, precompile } from "./utils.ts"

const buildInProcess = (
	files: Record<string, string>,
	order: string[]
): Record<string, string> =>
	JSON.parse(
		spawnSync(
			process.execPath,
			["--conditions", "ark-ts", "--input-type=module"],
			{
				cwd: fromHere(),
				encoding: "utf8",
				input: `import { Precompiler } from "@ark/precompile"
import { memoryHost } from "./utils.ts"
const files = ${JSON.stringify(files)}
const precompiler = new Precompiler(memoryHost(files))
const results = {}
for (const id of ${JSON.stringify(order)}) {
	const { code, modules } = precompiler.precompile(files[id], id)
	results[id] = JSON.stringify([code, modules])
}
console.log(JSON.stringify(results))`
			}
		).stdout
	)

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
import { v1grlzk90j47l5r as $arkv1grlzk90j47l5r } from "~arktype/1oajxqi1ghnkbg"
import { vcq9fbr09xh5h7 as $arkvcq9fbr09xh5h7 } from "~arktype/1oajxqi1ghnkbg"
import { vcbtdhu09o4jaz as $arkvcbtdhu09o4jaz } from "~arktype/1oajxqi1ghnkbg"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
const max = 64
$arkfixConfig()
export const User = /* @__PURE__ */ $arkv1grlzk90j47l5r()
export const Same = /* @__PURE__ */ $arkvcq9fbr09xh5h7()
export const Users = /* @__PURE__ */ $arkvcbtdhu09o4jaz()
export const isError = (data: unknown) => data instanceof ArkErrors`)
			attest(Object.keys(result.modules)).snap([
				"~arktype/1oajxqi1ghnkbg",
				"~arktype/intersectionp5cga70ta8lc1",
				"~arktype/intersection1924cq516cwsjx",
				"~arktype/intersection115aeqj1708qa6",
				"~arktype/1c1qm3a0f4lqlh"
			])
			attest(result.map?.sources).equals(["/main.ts"])
		})

		it("folds a Type's introspection at a site of its own", () => {
			const result = precompile(
				`import { type } from "arktype"
import { User } from "./user.ts"
const Point = type({ x: "number" })
export const json = Point.json
export const schema = Point.toJsonSchema()
export const userJson = User.toJSON()`,
				{
					"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string" })`
				}
			)
			attest(result.code).snap(`import "arktype"
import { vq10hui17onwk2 as $arkvq10hui17onwk2 } from "~arktype/12e9nnj1o377yg"
import { f1uqk4wc118rbng as $arkf1uqk4wc118rbng } from "~arktype/12e9nnj1o377yg"
import { f1mrbczv1xkyq28 as $arkf1mrbczv1xkyq28 } from "~arktype/12e9nnj1o377yg"
import { f17hn9zj1vlnawy as $arkf17hn9zj1vlnawy } from "~arktype/12e9nnj1o377yg"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { User } from "./user.ts"
import "./user.ts"
$arkfixConfig()
const Point = /* @__PURE__ */ $arkvq10hui17onwk2()
export const json = /* @__PURE__ */ $arkf1uqk4wc118rbng()
export const schema = /* @__PURE__ */ $arkf1mrbczv1xkyq28()
export const userJson = /* @__PURE__ */ $arkf17hn9zj1vlnawy()`)
			attest(
				Object.entries(result.modules).flatMap(([specifier, module]) =>
					specifier.includes("json") ? [module] : []
				)
			).snap([
				'import * as runtime from "arktype/runtime"\n\nvar jsonemxix50idrkjlValue\nconst jsonemxix50idrkjl = (() => {\n\treturn (jsonemxix50idrkjlValue ??= runtime.deepFreeze({ "required": [{ "key": "x", "value": "number" }], "domain": "object" }))\n})\n\nexport { jsonemxix50idrkjl }\n',
				'import * as runtime from "arktype/runtime"\n\nvar jsonf6515516jndbkValue\nconst jsonf6515516jndbk = (() => {\n\treturn (jsonf6515516jndbkValue ??= runtime.deepFreeze({ "required": [{ "key": "name", "value": "string" }], "domain": "object" }))\n})\n\nexport { jsonf6515516jndbk }\n'
			])
		})

		it("reads a member of a folded JSON Schema off what its call returns", () => {
			const result = precompile(`import { type } from "arktype"
const A = type({ a: "string" })
export const properties = A.toJsonSchema().properties
export const required = A.toJsonSchema()["required"]`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { v9tsbfu1su045q as $arkv9tsbfu1su045q } from "~arktype/1lm0rga1da016b"
import { fzdl36y1kl4y2z as $arkfzdl36y1kl4y2z } from "~arktype/1lm0rga1da016b"
import { f1kkci5112g5ynj as $arkf1kkci5112g5ynj } from "~arktype/1lm0rga1da016b"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
$arkfixConfig()
const A = /* @__PURE__ */ $arkv9tsbfu1su045q()
export const properties = $arkfzdl36y1kl4y2z().properties
export const required = $arkf1kkci5112g5ynj()["required"]`)
		})

		it("refuses to fold a JSON Schema calling a default's thunk", () => {
			const result = precompile(`import { type } from "arktype"
const T = type({ a: ["number[]", "=", () => []] })
export const schema = T.toJsonSchema()`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:3:23  T.toJsonSchema() can't be precompiled yet\n  a JSON Schema calling a default's thunk can't be precompiled to a standalone validator\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
		})

		it("folds introspection over a default a received Type checks", () => {
			const result = precompile(
				`import { type } from "arktype"
import { Positive } from "./positive.ts"
export const schema = type({ a: [Positive, "=", 5] }).toJsonSchema({
	fallback: { predicate: ctx => ctx.base }
})`,
				{
					"/positive.ts": `import { type } from "arktype"
export const Positive = type("number").narrow(n => n > 0)`
				}
			)
			attest(result.diagnostics).equals([])
		})

		it("folds a JSON Schema arktype can't write to a call throwing what arktype does, which a bundler keeps", () => {
			const result = precompile(`import { type } from "arktype"
const Length = type("string").pipe(s => s.length)
export const schema = Length.toJsonSchema()`)
			attest(result.code).snap(`import "arktype"
import { f2yr47m0y316vp as $arkf2yr47m0y316vp } from "~arktype/4rkqu31ltlvko"
import { f14gb4ky1hqquxy as $arkf14gb4ky1hqquxy } from "~arktype/4rkqu31ltlvko"
const Length = $arkf2yr47m0y316vp(s => s.length)
export const schema = $arkf14gb4ky1hqquxy()`)
		})

		it("folds introspection to a call receiving each function another module supplies that the Type's creation checks, and each a default's check calls", () => {
			const result = precompile(
				`import { type } from "arktype"
import { double } from "./containers.ts"
import { Doubled } from "./doubled.ts"
const Length = type("string").pipe(s => s.length)
const atMost = (n: number) => n <= 10
export const schemas = [
	Length.toJsonSchema(),
	Doubled.toJsonSchema(),
	type(["'a'", "=>", double]).toJsonSchema(),
	type({ a: [["number", ":", atMost], "=", 5] }).omit("a").json
]`,
				{
					"/containers.ts": `export const double = (n: number) => n * 2`,
					"/doubled.ts": `import { type } from "arktype"
import { double } from "./containers.ts"
export const Doubled = type("number").pipe(double)`
				}
			)
			attest(result.code).snap(`import "arktype"
import { f1hn2e10012161b as $arkf1hn2e10012161b } from "~arktype/16emsfu13j76mj"
import { f1ltp2ba0zx2cit as $arkf1ltp2ba0zx2cit } from "~arktype/16emsfu13j76mj"
import { f1nmc1u509jfhaw as $arkf1nmc1u509jfhaw } from "~arktype/16emsfu13j76mj"
import { f1qy79p41wr9kk2 as $arkf1qy79p41wr9kk2 } from "~arktype/16emsfu13j76mj"
import { f10le7xt0f1alcp as $arkf10le7xt0f1alcp } from "~arktype/16emsfu13j76mj"
import { double } from "./containers.ts"
import { Doubled } from "./doubled.ts"
const Length = $arkf1hn2e10012161b(s => s.length)
const atMost = (n: number) => n <= 10
export const schemas = [
	$arkf1ltp2ba0zx2cit(),
	$arkf1nmc1u509jfhaw(Doubled),
	$arkf1qy79p41wr9kk2(double),
	$arkf10le7xt0f1alcp(atMost)
]`)
		})

		it("loads arktype where it was imported", () => {
			attest(
				precompile(`import "./polyfill.ts"
import { type, scope as $ } from "arktype"
import * as config from "./config.ts"
export const A = type("string")`).code
			).snap(`import "./polyfill.ts"
import "arktype"
import { v62gs0h1rkzfa4 as $arkv62gs0h1rkzfa4 } from "~arktype/1yvqvci1whv1a6"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import * as config from "./config.ts"
$arkfixConfig()
export const A = /* @__PURE__ */ $arkv62gs0h1rkzfa4()`)
		})

		it("builds a shared unit as its module is evaluated", () => {
			const { modules } = precompile(`import { type } from "arktype"
export const A = type("string")`)
			attest(
				Object.entries(modules).find(([specifier]) =>
					specifier.startsWith("~arktype/domain")
				)
			).snap([
				"~arktype/domain131fpbi0sew247",
				'import * as runtime from "arktype/runtime"\n\nconst domain131fpbi0sew247 = /* @__PURE__ */ (function () {\nconst r0 = { value: { code: "domain", description: "a string" } }\nconst domain131fpbi0sew247Allows = function(data, ctx) {     return typeof data === "string"\n }\nconst domain131fpbi0sew247Apply = function(data, ctx) {     return typeof data === "string" || !ctx.failsAt(r0, data)\n }\nreturn [domain131fpbi0sew247Allows, domain131fpbi0sew247Apply]\n})()\n\nvar domain131fpbi0sew247Shape\nconst domain131fpbi0sew247Node = (() => {\n\treturn (domain131fpbi0sew247Shape ??= runtime.freeze({\n\ttraverseApply: domain131fpbi0sew247[1],\n\tallows: domain131fpbi0sew247[0]\n}))\n})\n\nexport { domain131fpbi0sew247, domain131fpbi0sew247Node }\n'
			])
		})

		it("hoists what a site calls where an import before arktype's reaches the module", () => {
			const files = {
				"/early.ts": `import { make } from "./main.ts"\nexport const made = make()`
			}
			const early = precompile(
				`import { made } from "./early.ts"
import { type } from "arktype"
export const make = () => type("string")`,
				files
			)
			attest(Object.keys(early.modules)).snap([
				"~arktype/godspv0ygxh2n",
				"~arktype/hoisted/domain131fpbi0sew247"
			])
			attest(
				Object.entries(early.modules).find(([specifier]) =>
					specifier.startsWith("~arktype/hoisted/domain")
				)
			).snap([
				"~arktype/hoisted/domain131fpbi0sew247",
				'import * as runtime from "arktype/runtime"\n\nvar domain131fpbi0sew247Unit\n\nfunction domain131fpbi0sew247() {\n\treturn (domain131fpbi0sew247Unit ??= (function () {\nconst r0 = { value: { code: "domain", description: "a string" } }\nconst domain131fpbi0sew247Allows = function(data, ctx) {     return typeof data === "string"\n }\nconst domain131fpbi0sew247Apply = function(data, ctx) {     return typeof data === "string" || !ctx.failsAt(r0, data)\n }\nreturn [domain131fpbi0sew247Allows, domain131fpbi0sew247Apply]\n})())\n}\n\nvar domain131fpbi0sew247Shape\nfunction domain131fpbi0sew247Node() {\n\treturn (domain131fpbi0sew247Shape ??= runtime.freeze({\n\ttraverseApply: domain131fpbi0sew247()[1],\n\tallows: domain131fpbi0sew247()[0]\n}))\n}\n\nexport { domain131fpbi0sew247, domain131fpbi0sew247Node }\n'
			])
			// imported after arktype, the cycle reaches the module once its artifact is evaluated
			const late = precompile(
				`import { type } from "arktype"
import { made } from "./early.ts"
export const make = () => type("string")`,
				files
			)
			attest(Object.keys(late.modules)).snap([
				"~arktype/e42ig708l51pk",
				"~arktype/domain131fpbi0sew247"
			])
		})

		it("builds a unit reading a builtin global at its first read", () => {
			const { modules } = precompile(`import { type } from "arktype"
export const N = type("string").pipe(Number)`)
			attest(
				Object.entries(modules).find(([specifier]) =>
					specifier.startsWith("~arktype/morph")
				)
			).snap([
				"~arktype/morphsfoxt60rfuj6u",
				'import * as runtime from "arktype/runtime"\nimport { domain131fpbi0sew247 } from "~arktype/domain131fpbi0sew247"\n\nvar morphsfoxt60rfuj6uUnit\n\nfunction morphsfoxt60rfuj6u() {\n\t"use strict"\n\treturn (morphsfoxt60rfuj6uUnit ??= (function ([domain131fpbi0sew247Allows, domain131fpbi0sew247Apply]) {\nconst r0 = globalThis["Number"]\nconst r1 = runtime.type.errors\nconst r2 = runtime.TransformErrors\nconst morphsfoxt60rfuj6uAllows = function(data, ctx) {     return domain131fpbi0sew247Allows(data)\n }\nconst morphsfoxt60rfuj6uApply = function(data, ctx) {     return domain131fpbi0sew247Apply(data, ctx)\n }\nconst morphsfoxt60rfuj6uTransform = function(data, ctx) {     const morphed0 = r0(data)\n    if (morphed0 instanceof r1) {\n        return new r2(morphed0, data)\n    }\n    return morphed0\n }\nreturn [morphsfoxt60rfuj6uAllows, morphsfoxt60rfuj6uApply, morphsfoxt60rfuj6uTransform]\n})(domain131fpbi0sew247))\n}\n\nvar morphsfoxt60rfuj6uShape\nconst morphsfoxt60rfuj6uNode = (() => {\n\treturn (morphsfoxt60rfuj6uShape ??= runtime.freeze({\n\ttransforms: true,\n\ttraverseApply: morphsfoxt60rfuj6u()[1],\n\ttraverseTransform: morphsfoxt60rfuj6u()[2],\n\tallows: morphsfoxt60rfuj6u()[0]\n}))\n})\n\nexport { morphsfoxt60rfuj6u, morphsfoxt60rfuj6uNode }\n'
			])
		})

		it("keeps a minified module's statements apart", () => {
			const source = `import"./polyfill.ts";import{type}from"arktype";export const A=type("string");`
			attest(precompile(source).code)
				.snap(`import"./polyfill.ts";import "arktype";
import { vq0j6e21xyk07n as $arkvq0j6e21xyk07n } from "~arktype/16nvqu80bhkx0i"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
$arkfixConfig()
export const A=/* @__PURE__ */ $arkvq0j6e21xyk07n();`)
			attest(precompile(source, {}, { runtime: "arktype" }).code)
				.snap(`import"./polyfill.ts";import{type}from"arktype";
import "~arktype/units/h6eh021988eyz"
export const A=type("string");`)
		})

		it("reports an export arktype/runtime lacks that a kept helper reads", () => {
			const result = precompile(`import { match, scope } from "arktype"
const isLong = (s: string) => s.length > 1
const scoped = (fn: (s: string) => boolean) => scope({ a: "string" }).type("a").narrow(fn)
const matcher = (fn: (s: string) => string) => match({ string: fn, default: "assert" })
export const A = scoped(isLong)
export const M = matcher(s => s)`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:3:48  `scope` is arktype's, which arktype/runtime doesn't export, so a standalone build can't load this module\n  Read it only in a definition the build precompiles or one marked // @ark-runtime, or build with runtime: \"arktype\".",
				"/main.ts:4:48  `match` is arktype's, which arktype/runtime doesn't export, so a standalone build can't load this module\n  Read it only in a definition the build precompiles or one marked // @ark-runtime, or build with runtime: \"arktype\"."
			])
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
export const E = type({ "+": "delete", "[string]": "string", a: "string.date.parse" })
export const F = type("number")
export const G = type("string").equals("string")
export const H = type("string").meta
export const I = type({ a: "string" }).props[0].key
export const J = type({ a: "string" }).in.extends("object")
export const K = type("string").extends(type("string").in)`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:8:18  type(\"strin\") throws a ParseError\n  'strin' is unresolvable\n  The precompiled site throws the same ParseError when it is created.",
				'/main.ts:9:18  type({ "+": "delete", "[string]": "string", a: "string.date… can\'t be precompiled yet\n  structure { [string]: string, a: (In: string) => Out<Date>, + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:11:18  type("string").equals("string") can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type("string").equals`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:13:18  type({ a: "string" }).props[0].key can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type({ a: "string" }).props`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:14:18  type({ a: "string" }).in.extends("object") can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type({ a: "string" }).in.extends`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:15:18  type("string").extends(type("string").in) can\'t be precompiled yet\n  its value is not a Type, Module, Scope, Generic or TypedFn\n  it reads `type("string").extends`, which a standalone validator lacks\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { type } from "arktype"
import { fa7m7wf09pf4az as $arkfa7m7wf09pf4az } from "~arktype/wlf2on1o09zs2"
import { f1mgbeg1hlx5g1 as $arkf1mgbeg1hlx5g1 } from "~arktype/wlf2on1o09zs2"
import { v1clwekn1s6e3gq as $arkv1clwekn1s6e3gq } from "~arktype/wlf2on1o09zs2"
import { v1hfscsk1nhk1a9 as $arkv1hfscsk1nhk1a9 } from "~arktype/wlf2on1o09zs2"
import { v16rwth51i4aph5 as $arkv16rwth51i4aph5 } from "~arktype/wlf2on1o09zs2"
import $ark1sve6ft0pa6e4h from "~arktype/xuhdp21syk96k"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const field = (n: number) => type(\`string <= \${n}\`)
export const A = $arkfa7m7wf09pf4az(trim)
export const B = $arkf1mgbeg1hlx5g1(max)
$arkfixConfig()
export const C = /* @__PURE__ */ $arkv1clwekn1s6e3gq()
export const D = $ark1sve6ft0pa6e4h()
export const E = type({ "+": "delete", "[string]": "string", a: "string.date.parse" })
export const F = /* @__PURE__ */ $arkv1hfscsk1nhk1a9()
export const G = type("string").equals("string")
export const H = $arkv16rwth51i4aph5().meta
export const I = type({ a: "string" }).props[0].key
export const J = type({ a: "string" }).in.extends("object")
export const K = type("string").extends(type("string").in)`)
		})

		it("folds Modules", () => {
			const result = precompile(`import { scope, type } from "arktype"
export const types = scope({ tree: { value: "number", "children?": "tree[]" } }).export()
export const M = type.module({ a: "string", b: { c: "a" } })`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { vsjkdln005ypg0 as $arkvsjkdln005ypg0 } from "~arktype/mvs05m0ub2cla"
import { vuorrac1fkpkl6 as $arkvuorrac1fkpkl6 } from "~arktype/mvs05m0ub2cla"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
$arkfixConfig()
export const types = /* @__PURE__ */ $arkvsjkdln005ypg0()
export const M = /* @__PURE__ */ $arkvuorrac1fkpkl6()`)
			attest(
				Object.values(result.modules)[0]
					.split("\n")
					.filter(line => /^const module\d/.test(line))
			).snap([
				'const module0 = runtime.holdHoles(runtime.freeze({ ["tree"]: validator0 }), "1r9tghn1bsk9qz")',
				'const module0 = runtime.holdHoles(runtime.freeze({ ["a"]: validator0, ["b"]: validator1 }), "1y03dsd0lnbk50")'
			])
		})

		it("folds Scopes and Generics to empty objects", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ tree: { value: "number", "children?": "tree[]" }, "box<t>": { box: "t" } })
export const types = $.export()
export const Tree = $.type("tree")
export const Box = type("<t>", { box: "t" })
export const BoxedTree = Box(types.tree)`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { vq7pa6c00qqwz6 as $arkvq7pa6c00qqwz6 } from "~arktype/tkg5e61snvicu"
import { v1mrbczv1xkyq28 as $arkv1mrbczv1xkyq28 } from "~arktype/tkg5e61snvicu"
import { vcbtdhu09o4jaz as $arkvcbtdhu09o4jaz } from "~arktype/tkg5e61snvicu"
import { vb8723u0smnev1 as $arkvb8723u0smnev1 } from "~arktype/tkg5e61snvicu"
import { v1tryxgh0tpn3pk as $arkv1tryxgh0tpn3pk } from "~arktype/tkg5e61snvicu"
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
					.filter(line => /^const (standIn|module)\d/.test(line))
			).snap([
				'const standIn0 = runtime.holdHoles(runtime.freeze({}), "2ug25d0g2fmpu")',
				'const standIn0 = runtime.holdHoles(runtime.freeze({}), "yc0zfl03fckbs")',
				'const module0 = runtime.holdHoles(runtime.freeze({ ["tree"]: validator0, ["box"]: standIn0 }), "djnt2s1y9gthf")',
				'const standIn0 = runtime.holdHoles(runtime.freeze({}), "dpg9qw0fjxmwu")'
			])
		})

		it("folds a Module's alias named like a member a Type has, as the Type it is", () => {
			const result = precompile(`import { scope } from "arktype"
const M = scope({ toJsonSchema: "string", json: { a: "number" } }).export()
export const schema = M.toJsonSchema.toJsonSchema()
export const json = M.json.json`)
			attest(result.diagnostics).equals([])
			attest(
				result.code.split("\n").filter(line => line.startsWith("export"))
			).snap([
				"export const schema = /* @__PURE__ */ $arkf1qq8chi1g5mzo4()",
				"export const json = /* @__PURE__ */ $arkfe5h3530tuatax()"
			])
		})

		it("folds a Type a call through a Scope, Module or Generic returns, whose validator member is read at runtime", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ a: "string", b: { c: "a" } })
const G = type("<t>", { box: "t" })
export const asserted = $.type("b").assert({ c: "x" })
export const allowed = G("string").allows({ box: "x" })
export const meta = $.type("b").meta
export const exported = $.export().b.assert({ c: "x" })
export const aliased = type.module({ b: "string" }).b.allows("x")
const validate = $.type("b")["~standard"].validate
export const validated = validate({ c: "x" })`)
			attest(result.diagnostics).equals([])
			attest(
				result.code.split("\n").filter(line => line.startsWith("export"))
			).snap([
				'export const asserted = $arkvmnhzxk0t966u8().assert({ c: "x" })',
				'export const allowed = $arkv1fvusin0klchoh().allows({ box: "x" })',
				"export const meta = $arkvxhw4ll1hdjksu().meta",
				'export const exported = $arkv1s4lre1cs5rzj().assert({ c: "x" })',
				'export const aliased = $arkv14p7bhk136e9yx().allows("x")',
				'export const validated = validate({ c: "x" })'
			])
		})

		it("refuses the json of a Scope or Generic, which their empty objects lack", () => {
			const result = precompile(`import { scope, type } from "arktype"
const $ = scope({ a: "string" })
const G = type("<t>", { x: "t" })
export const json = [$.json, G.json, scope({ "b<t>": { x: "t" } }).export().b.json]`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:4:22  $.json cannot be precompiled\n  `$.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
				'/main.ts:4:30  G.json cannot be precompiled\n  `G.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
				'/main.ts:4:38  scope({ "b<t>": { x: "t" } }).export().b.json cannot be precompiled\n  `scope({ "b<t>": { x: "t" } }).export().b.json` is not a documented member its content alone decides, so it can depend on registry names or node ids\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
			])
		})

		it("receives a Scope a site reads through a member chain", () => {
			const result = precompile(`import { scope } from "arktype"
const isLong = (s: string) => s.length > 1
const $ = scope({ s: ["string", ":", isLong] })
export const F = $.type.fn("s")(s => s)
export const O = $.type.or("s", "number")`)
			attest(result.diagnostics).equals([])
			attest(
				result.code.split("\n").filter(line => line.startsWith("export"))
			).snap([
				"export const F = $arkfh269dm1h6q2v5($, s => s)",
				"export const O = $arkfe5h3530tuatax($)"
			])
		})

		it("refuses a Scope's thunk alias only where a site resolves it and a program can replace the Scope", () => {
			const scopeOf = (name: string) => `scope({
		b: "3.14",
		a: ["number", "=>", stringify],
		aAndB: () => ${name}.type("a&b"),
		bAndA: () => ${name}.type("b&a")
	})`
			const result = precompile(
				`import { scope } from "arktype"
import { imported } from "./schemas.ts"
export const make = () => {
	const stringify = (data: number) => \`\${data}\`
	const $ = ${scopeOf("$")}
	const types = $.export()
	return types
}
export const Imported = imported.export()
export const A = imported.type("a[]")`,
				{
					"/schemas.ts": `import { scope } from "arktype"
const stringify = (data: number) => \`\${data}\`
export const imported = ${scopeOf("imported")}`
				}
			)
			attest(
				result.diagnostics.map(d => [d.line, d.message, ...d.reasons])
			).snap([
				[
					14,
					"imported.export() can't be precompiled yet",
					"`imported`'s alias `aAndB` is a thunk the site resolves, so a factory can't compare what it returns"
				]
			])
		})

		it("names the Scope holding a thunk alias a received Type or Generic resolves", () => {
			const result = precompile(
				`import { holder } from "./schemas.ts"
export const A = holder.T.or("t")
export const B = holder.m.G("number")`,
				{
					"/schemas.ts": `import { scope } from "arktype"
const $ = scope({ "#t": () => $.type("string[]"), "G<x>": { v: "x", w: "t" } })
export const holder = { T: $.type("bigint"), m: $.export() }`
				}
			)
			attest(result.diagnostics.flatMap(d => d.reasons)).snap([
				"`holder.T.$`'s alias `t` is a thunk the site resolves, so a factory can't compare what it returns",
				"`holder.m.G.$`'s alias `t` is a thunk the site resolves, so a factory can't compare what it returns"
			])
		})

		it("keys a default's check by its node's traversal, not the rest of the node's Scope", () => {
			const result = precompile(
				`import { Holder } from "./holder.ts"
export const Defaulted = Holder.and({ p: ["number", "=", 5] })`,
				{
					"/holder.ts": `import { scope, type } from "arktype"
const isPositive = (n: number) => n > 0
const isNonEmpty = (s: string) => s.length > 0
const $ = scope({ positive: ["number", ":", isPositive], name: ["string", ":", isNonEmpty] })
export const Holder = type({ "p?": $.type("positive") })`
				}
			)
			attest(result.diagnostics).equals([])
		})

		it("refuses a Type whose Scope's narrow arktype tested on literals only where the site resolves its alias", () => {
			const result = precompile(
				`import { types } from "./handlers.ts"
export const Aged = types.user.and({ age: "number" })
export const Coded = types.user.and({ c: "code" })`,
				{
					"/handlers.ts": `import { scope } from "arktype"
const isAllowed = (s: string) => s !== "b"
export const types = scope({ code: ["'a' | 'b'", ":", isAllowed], user: { name: "string" } }).export()`
				}
			)
			attest(result.diagnostics.map(d => [d.line, ...d.reasons])).snap([
				[
					3,
					"arktype calls `isAllowed` (/handlers.ts:2:19) while defining what `types.user.$` creates, so a factory can't compare it"
				]
			])
		})

		it("names the Scope of a received Type as what its key can't compare", () => {
			const result = precompile(
				`import { types } from "./handlers.ts"
export const Users = types.user.array()`,
				{
					"/handlers.ts": `import { scope } from "arktype"
export const types = scope(
	{ user: { name: "string" } },
	{ domain: { message: ctx => \`bad \${ctx.path}\` } }
).export()`
				}
			)
			attest(result.diagnostics.flatMap(d => d.reasons)).snap([
				"`types.user.$` configures `domain.message` with a function, whose results decide what it creates, so a factory can't compare it"
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
import { v1bev4io0lhnrds as $arkv1bev4io0lhnrds } from "~arktype/1oezjdl0fpu1s5"
import { v17s8udm1bx77ds as $arkv17s8udm1bx77ds } from "~arktype/1oezjdl0fpu1s5"
const create = () => {
	const $ = $arkv1bev4io0lhnrds()
	const types = $arkv17s8udm1bx77ds()
	return types
}`)
		})

		it("folds to a value what arktype creates anew each time a function runs", () => {
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
import { v1a6evaf1ilxqcd as $arkv1a6evaf1ilxqcd } from "~arktype/p7qsnf1qjci61"
import { v14gb4ky1hqquxy as $arkv14gb4ky1hqquxy } from "~arktype/p7qsnf1qjci61"
import { v1fqowp70udipzn as $arkv1fqowp70udipzn } from "~arktype/p7qsnf1qjci61"
import { v1isbncu11it64l as $arkv1isbncu11it64l } from "~arktype/p7qsnf1qjci61"
import { vr49tao0yiilut as $arkvr49tao0yiilut } from "~arktype/p7qsnf1qjci61"
export const make = () => ({
	$: $arkv1a6evaf1ilxqcd(),
	types: $arkv14gb4ky1hqquxy(),
	Box: $arkv1fqowp70udipzn(),
	Trimmed: $arkv1isbncu11it64l(),
	Text: $arkvr49tao0yiilut()
})`)
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

		it("reads a module given after another read it as the module that one read", () => {
			const files: Record<string, string> = {
				"/x.ts": 'export const shape = { a: "string" }',
				"/y.ts": 'import { shape as s } from "./x.ts"\nexport const shape = s',
				"/c.ts":
					'import { type } from "arktype"\nimport { shape } from "./y.ts"\nexport const V = type(shape)',
				"/b.ts":
					'import { type } from "arktype"\nimport { shape } from "./x.ts"\nimport { shape as again } from "./y.ts"\nexport const U = type(shape === again ? "string" : "number")'
			}
			const precompiler = new Precompiler(memoryHost(files))
			for (const id of ["/y.ts", "/c.ts", "/x.ts"])
				precompiler.precompile(files[id], id)
			attest(
				precompiler
					.precompile(files["/b.ts"], "/b.ts")
					.sites.map(site => (site.value as { expression: string }).expression)
			).equals(["string"])
		})

		it("reads a module given again as the module it was", () => {
			const files: Record<string, string> = {
				"/x.ts": 'export const shape = { a: "string" }',
				"/y.ts": 'import { shape as s } from "./x.ts"\nexport const shape = s',
				"/b.ts":
					'import { type } from "arktype"\nimport { shape } from "./x.ts"\nimport { shape as again } from "./y.ts"\nexport const U = type(shape === again ? "string" : "number")'
			}
			const precompiler = new Precompiler(memoryHost(files))
			for (const id of ["/x.ts", "/y.ts", "/b.ts", "/x.ts"])
				precompiler.precompile(files[id], id)
			attest(
				precompiler
					.precompile(files["/b.ts"], "/b.ts")
					.sites.map(site => (site.value as { expression: string }).expression)
			).equals(["string"])
		})

		it("reads a module's importers again once it's given another version", () => {
			const files: Record<string, string> = {
				"/x.ts": 'export const shape = { a: "string" }',
				"/y.ts": 'import { shape as s } from "./x.ts"\nexport const shape = s',
				"/c.ts":
					'import { type } from "arktype"\nimport { shape } from "./y.ts"\nexport const V = type(shape)'
			}
			const precompiler = new Precompiler(memoryHost(files))
			precompiler.precompile(files["/c.ts"], "/c.ts")
			precompiler.precompile('export const shape = { a: "number" }', "/x.ts")
			attest(
				precompiler
					.precompile(files["/c.ts"], "/c.ts")
					.sites.map(site => (site.value as { expression: string }).expression)
			).equals(["{ a: number }"])
		})

		it("folds a module given again as it folded it", () => {
			const source = `import { scope } from "arktype"
const $ = scope({ a: () => 42 })
export const exported = () => $.export()`
			const precompiler = new Precompiler(memoryHost({ "/main.ts": source }))
			const statusesOf = () =>
				precompiler
					.precompile(source, "/main.ts")
					.sites.map(site => `${site.line}:${site.column} ${site.status}`)
			attest(statusesOf()).equals(statusesOf())
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
import { f1h9lain030c2md as $arkf1h9lain030c2md } from "~arktype/9ci1ut17fgyg4"
import { f1uczdsm0f1mhaw as $arkf1uczdsm0f1mhaw } from "~arktype/9ci1ut17fgyg4"
import { fadtawc0az5hrt as $arkfadtawc0az5hrt } from "~arktype/9ci1ut17fgyg4"
import { f1xt3f6o16uszem as $arkf1xt3f6o16uszem } from "~arktype/9ci1ut17fgyg4"
import { f1nojioh0bjqrvh as $arkf1nojioh0bjqrvh } from "~arktype/9ci1ut17fgyg4"
import { f1okx6ql1wtv9z7 as $arkf1okx6ql1wtv9z7 } from "~arktype/9ci1ut17fgyg4"
import { faot5y01xoc4hs as $arkfaot5y01xoc4hs } from "~arktype/9ci1ut17fgyg4"
import { fuz78vg0xn6j6v as $arkfuz78vg0xn6j6v } from "~arktype/9ci1ut17fgyg4"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
export const Name = $arkf1h9lain030c2md(trim, (s, ctx) => s.length > 0)
export const User = $arkf1uczdsm0f1mhaw(Name, Pet, petTag)
export const Either = $arkfadtawc0az5hrt(trim)
export const Extended = $arkf1xt3f6o16uszem(ext)
export const Pair = $arkf1nojioh0bjqrvh(Name, Either)
export const Short = $arkf1okx6ql1wtv9z7(Name, s => s.length < 9)
export const Stamped = $arkfaot5y01xoc4hs(() => new Date())
class Kitten extends Pet {}
export const Kept = $arkfuz78vg0xn6j6v(Pet, Kitten)`)
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
				"/inputs.ts:18:9  type(alias.name) can't be precompiled yet\n  `o` (/inputs.ts:7:7) is shadowed where the site is written, so its factory can't receive it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(result.code).snap(`import { type } from "arktype"
import { f1pndslh1lfvnd2 as $arkf1pndslh1lfvnd2 } from "~arktype/19o0ly40bfd4g8"
import { fcoobse1hdwpxv as $arkfcoobse1hdwpxv } from "~arktype/19o0ly40bfd4g8"
import { fs5mhm20oegtat as $arkfs5mhm20oegtat } from "~arktype/19o0ly40bfd4g8"
import { fwuycaw1jorjbe as $arkfwuycaw1jorjbe } from "~arktype/19o0ly40bfd4g8"
import { f18h70z31d8anaf as $arkf18h70z31d8anaf } from "~arktype/19o0ly40bfd4g8"
import { fhpkoym15zgexb as $arkfhpkoym15zgexb } from "~arktype/19o0ly40bfd4g8"
import { max } from "./limits.ts"
import { reboxed } from "./reboxed.ts"
import { shape } from "./shapes.ts"
import * as limits from "./limits.ts"
const trim = (s: string) => s.trim()
const o = { name: "string", tags: ["string"] }
const alias = o
export const Local = $arkf1pndslh1lfvnd2(trim, o)
export const Imported = $arkfcoobse1hdwpxv(limits.max, o)
export const Added = $arkfs5mhm20oegtat(reboxed)
export const Defined = $arkfwuycaw1jorjbe(process.env.NODE_ENV)
export const Namespaced = $arkf18h70z31d8anaf(limits.boxed)
const box = shape
export const Imports = ((shape: number) => $arkfhpkoym15zgexb($arki1rnr3cp0ewvqsd, box))(1)
export const Shadowed = (() => {
	const o = 1
	return type(alias.name)
})()
import { shape as $arki1rnr3cp0ewvqsd } from "./shapes.ts"`)
		})

		it("receives an input in a module on an import cycle only through an import the program runs", () => {
			const helper = (name: string) => `import { type } from "arktype"
const T = type({ a: "string" })
export function ${name}(extra: object) { return T.and(extra) }`
			const source = `import { viaG, viaH, viaK } from "./app.ts"
import { g } from "./g.ts"
import { h } from "./h.ts"
export const G = viaG()
export const H = viaH()
export const K = viaK()
export const Direct = h({ c: "number" })
let shape: typeof g`
			const result = precompileModule(
				source,
				"/main.ts",
				memoryHost({
					"/main.ts": source,
					"/app.ts": `import "./main.ts"
import { g } from "./g.ts"
import { h } from "./h.ts"
import { k } from "./k.ts"
export function viaG() { return g({ b: "number" }) }
export function viaH() { return h({ b: "number" }) }
export function viaK() { return k({ b: "number" }) }`,
					"/g.ts": helper("g"),
					"/h.ts": helper("h"),
					"/k.ts": helper("k")
				})
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:4:18  viaG() can't be precompiled yet\n  importing `g` from /g.ts here could run it earlier than the program does, as /main.ts is on an import cycle\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				"/main.ts:6:18  viaK() can't be precompiled yet\n  importing `k` from /k.ts here could run it earlier than the program does, as /main.ts is on an import cycle\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(result.code).snap(`import { viaG, viaH, viaK } from "./app.ts"
import { f1fqowp70udipzn as $arkf1fqowp70udipzn } from "~arktype/cn841f0s68leh"
import { v31x3lt13lnlin as $arkv31x3lt13lnlin } from "~arktype/cn841f0s68leh"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import { g } from "./g.ts"
import { h } from "./h.ts"
export const G = viaG()
export const H = $arkf1fqowp70udipzn(viaH, h)
export const K = viaK()
$arkfixConfig()
export const Direct = /* @__PURE__ */ $arkv31x3lt13lnlin()
let shape: typeof g`)
		})

		it("throws the ParseError of a site holding sites, folding none of them", () => {
			const result = precompile(`import { type } from "arktype"
export const M = type.module({
	a: type("missing").and(type({ b: "string" })),
	c: ["string", ":", (data: unknown) => type("string").allows(data)]
})`)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:2:18  type.module({ a: type("missing").and(type({ b: "string" }))… throws a ParseError\n  \'missing\' is unresolvable\n  The precompiled site throws the same ParseError when it is created.'
			])
			attest(result.code).snap(`import "arktype"
import $arklw742z1ab0dfu from "~arktype/5awdy10agxwhh"
export const M = $arklw742z1ab0dfu()`)
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
				'/thrower.ts:7:25  type("1").narrow(isZero) can\'t be precompiled yet\n  arktype calls `isZero` (/thrower.ts:7:42)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/thrower.ts:8:26  type("1").narrow(n => n === 0) can\'t be precompiled yet\n  arktype calls `n => n === 0` (/thrower.ts:8:43)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:9:21  type.instanceOf(Dog).and(type.instanceOf(Cat)) can't be precompiled yet\n  arktype holds `Dog` (/thrower.ts:9:37)\n  arktype holds `Cat` (/thrower.ts:9:62)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:10:26  type("1").and("2") throws a ParseError\n  Intersection of 1 and 2 results in an unsatisfiable type\n  The precompiled site throws the same ParseError when it is created.',
				'/thrower.ts:18:27  type("1").and(Negative) can\'t be precompiled yet\n  arktype is passed a value holding `isNegative` (/thrower.ts:11:20)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:19:31  DogT.and(CatT) can't be precompiled yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  arktype is passed a value holding `Cat` (/thrower.ts:4:1)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				"/thrower.ts:20:23  M1.and(M2) can't be precompiled yet\n  arktype is passed a value holding `f` (/thrower.ts:15:18)\n  arktype is passed a value holding `g` (/thrower.ts:15:46)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:23:23  type("1").and(negative()) can\'t be precompiled yet\n  arktype is passed a value holding `isNegative` (/thrower.ts:11:20)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/thrower.ts:24:28  type.instanceOf(Error).and(dog()) can't be precompiled yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/thrower.ts:25:23  scope({ a: DogT, b: "a & Error" }).export() can\'t be precompiled yet\n  arktype is passed a value holding `Dog` (/thrower.ts:5:1)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/thrower.ts:26:22  type("number").props throws a ParseError\n  props operand must be an object (was number)\n  The precompiled site throws the same ParseError when it is created.',
				'/thrower.ts:27:30  type("number").narrow(isNegative).props can\'t be precompiled yet\n  arktype calls `isNegative` (/thrower.ts:27:52)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { scope, type } from "arktype"
import $arkhhfme10rgsm2a from "~arktype/in37f40k9qr2u"
import { fi32fv11rij4as as $arkfi32fv11rij4as } from "~arktype/d0587u154nah3"
import { fge601l1l8djke as $arkfge601l1l8djke } from "~arktype/d0587u154nah3"
import { f15on17z0md0pi6 as $arkf15on17z0md0pi6 } from "~arktype/d0587u154nah3"
import { f1rkl43l16h747g as $arkf1rkl43l16h747g } from "~arktype/d0587u154nah3"
import { fk4dreo1vs7gyk as $arkfk4dreo1vs7gyk } from "~arktype/d0587u154nah3"
import $arkrhchbs1xkut83 from "~arktype/o94jis1u2oxph"
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
const Negative = $arkfi32fv11rij4as(isNegative)
const DogT = $arkfge601l1l8djke(Dog)
const CatT = $arkf15on17z0md0pi6(Cat)
const fns = { f: (s: string) => s.length, g: (s: string) => s.trim() }
const M1 = $arkf1rkl43l16h747g(fns.f)
const M2 = $arkfk4dreo1vs7gyk(fns.g)
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
				"/checked.ts:8:23  type(single(\"string\")) can't be precompiled yet\n  `default` (/helpers.ts:5:16) is a static helper its module doesn't export through a binding, so a test driver can't register it\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(checked.code).snap(`import { type } from "arktype"
import { f13yfk091jb2s9c as $arkf13yfk091jb2s9c } from "~arktype/2vtkme143nwog"
import { f1mgbeg1hlx5g1 as $arkf1mgbeg1hlx5g1 } from "~arktype/2vtkme143nwog"
import { f1t2p9ht1hshs19 as $arkf1t2p9ht1hshs19 } from "~arktype/2vtkme143nwog"
import single, { list } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const own = (def: string) => list(def)
export const List = $arkf13yfk091jb2s9c(list)
export const Own = $arkf1mgbeg1hlx5g1(list)
export const Optional = $arkf1t2p9ht1hshs19(helpers.optional, $arkinfk34400tx9ll)
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
import { f1c4gvm01nuxz5 as $arkf1c4gvm01nuxz5 } from "~arktype/3g7prs048uvc9"
import { fos9smi09rf17b as $arkfos9smi09rf17b } from "~arktype/3g7prs048uvc9"
import { fel68or0or1ja7 as $arkfel68or0or1ja7 } from "~arktype/3g7prs048uvc9"
import { a } from "./a.ts"
import { alias } from "./b.ts"
const fns = { check: (s: string) => s.length > 3 }
const other = { check: fns.check }
const Name = $arkf1c4gvm01nuxz5(fns.check)
export const Aliased = $arkfos9smi09rf17b(a, alias)
export const Checked = $arkfel68or0or1ja7(other.check, fns.check, Name)`)
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

		it("checks the holes another module supplies through two texts are distinct", () => {
			const result = precompile(
				`import { type } from "arktype"
import { a } from "./a.ts"
import { b } from "./b.ts"
export const Both = type("string").pipe(a, b)`,
				{
					"/a.ts": "export const a = (s: string) => s",
					"/b.ts": "export const b = (s: string) => s"
				}
			)
			attest(result.diagnostics).equals([])
			attest(
				result.modules[Object.keys(result.modules)[0]].match(
					/runtime\.checkDistinct\(.*\)/g
				)
			).snap([
				'runtime.checkDistinct([p0, p1], ["`a` (/main.ts:4:41)","`b` (/main.ts:4:44)"])'
			])
		})

		it("unsupported sites", () => {
			const result = precompile(
				`import { type } from "arktype"
class Foo {}
export const Deleted = type({ "+": "delete", "[string]": "string", a: type.instanceOf(Foo).or("string.date.parse") })`
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				'/main.ts:3:24  type({ "+": "delete", "[string]": "string", a: type.instanc… can\'t be precompiled yet\n  structure { [string]: string, a: (In: string) => Out<Date> | Foo, + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
		})

		it("checks a binding each factory receives with one function", () => {
			const result = precompile(
				`import { type } from "arktype"
import { Id } from "./id.ts"
export const User = type({ id: Id })
export const Post = type({ id: Id, author: Id })`,
				{
					"/id.ts": `import { type } from "arktype"
export const Id = type("string").narrow(s => s.length === 8)`
				}
			)
			attest(
				Object.entries(result.modules).flatMap(([specifier, module]) =>
					specifier.includes("receive") ? [module] : []
				)
			).snap([
				'import * as runtime from "arktype/runtime"\n\nconst receive14elk3g1h9owl9 = ((holder) => {\n\treturn runtime.holesOf(holder, "1pzsli11cbnwzw", "`Id`")\n})\n\nexport { receive14elk3g1h9owl9 }\n'
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
import { f1bg5ghg1udq2qc as $arkf1bg5ghg1udq2qc } from "~arktype/uh33ft0z1dh9y"
import { fnlxeht0j9hv9h as $arkfnlxeht0j9hv9h } from "~arktype/uh33ft0z1dh9y"
import { fe5h3530tuatax as $arkfe5h3530tuatax } from "~arktype/uh33ft0z1dh9y"
const tag = Symbol("tag")
const T = $arkf1bg5ghg1udq2qc(tag)
export const Union = $arkfnlxeht0j9hv9h(T)
export const In = $arkfe5h3530tuatax(T)`)
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
				'/main.ts:11:25  type([type("string").narrow(h), ...shorts().map(h => type("… can\'t be precompiled yet\n  arktype holds `(s: string) => s.length < 3` (/main.ts:3:17), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:12:24  type(Object.values(fns).map(h => type("string").narrow(h)) … can\'t be precompiled yet\n  arktype holds `(s: string) => s.length > 1` (/main.ts:2:16), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				"/main.ts:13:24  type(longs().map(N => type({ n: N })) as never) can't be precompiled yet\n  arktype holds `(s: string) => s.length > 1` (/main.ts:2:16), which the site cannot pass to its factory\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
				'/main.ts:14:23  type(shorts().map(h => type("string").narrow(h || isLong)) … can\'t be precompiled yet\n  arktype holds `(s: string) => s.length < 3` (/main.ts:3:17), which the site reads outside its own source\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { type } from "arktype"
import { fgxncna0e0vtuy as $arkfgxncna0e0vtuy } from "~arktype/9391pq18vjf21"
import { fue93h80tgxvhc as $arkfue93h80tgxvhc } from "~arktype/9391pq18vjf21"
import { fvuztpd0flqkce as $arkfvuztpd0flqkce } from "~arktype/9391pq18vjf21"
import { f1pp1bhu1wky3z8 as $arkf1pp1bhu1wky3z8 } from "~arktype/9391pq18vjf21"
import { f1vcmva31ng9y85 as $arkf1vcmva31ng9y85 } from "~arktype/9391pq18vjf21"
const isLong = (s: string) => s.length > 1
const isShort = (s: string) => s.length < 3
const h = isLong
const fns = { isLong }
const shorts = () => [isShort]
const Long = $arkfgxncna0e0vtuy(isLong)
const N = $arkfue93h80tgxvhc(isShort)
const longs = () => [Long]
export const Mapped = $arkfvuztpd0flqkce(isLong)
export const Shadowed = type([type("string").narrow(h), ...shorts().map(h => type("string").narrow(h))] as never)
export const Renamed = type(Object.values(fns).map(h => type("string").narrow(h)) as never)
export const Through = type(longs().map(N => type({ n: N })) as never)
export const Either = type(shorts().map(h => type("string").narrow(h || isLong)) as never)
export const Own = $arkf1pp1bhu1wky3z8(function (this: unknown, s) { return s.length > 1 && !this })
export const OwnFirst = $arkf1vcmva31ng9y85(function (this: unknown, s) { return this === undefined && s.length > 1 })`)
		})

		it("passes each function one expression created", () => {
			const result = precompile(
				`import { type } from "arktype"
const longer = (n: number) => (s: string) => s.length > n
export const T = type("string").narrow(longer(3)).narrow(longer(1))`
			)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { farwx4t08ya85o as $arkfarwx4t08ya85o } from "~arktype/11reco80886a6a"
const longer = (n: number) => (s: string) => s.length > n
export const T = $arkfarwx4t08ya85o(longer(3), longer(1))`)
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
				"interned3"
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
				"/main.ts:10:21  trimmed().and(second()) can't be precompiled yet\n  arktype holds `(s: string) => s.trim()` (/main.ts:2:14), which the site cannot pass to its factory\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(result.code).snap(`import "arktype"
import { vq10hui17onwk2 as $arkvq10hui17onwk2 } from "~arktype/1vmuv5i15zj743"
import { v1oigsr31najz55 as $arkv1oigsr31najz55 } from "~arktype/1vmuv5i15zj743"
import { fd9jxkn0kakf0g as $arkfd9jxkn0kakf0g } from "~arktype/1vmuv5i15zj743"
import { v112lir714tv8ze as $arkv112lir714tv8ze } from "~arktype/1vmuv5i15zj743"
import { vrg81gy0tev40w as $arkvrg81gy0tev40w } from "~arktype/1vmuv5i15zj743"
import { vp99ye0097h426 as $arkvp99ye0097h426 } from "~arktype/1vmuv5i15zj743"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
const trim = (s: string) => s.trim()
$arkfixConfig()
const A = /* @__PURE__ */ $arkvq10hui17onwk2()
const B = /* @__PURE__ */ $arkv1oigsr31najz55()
const Trimmed = $arkfd9jxkn0kakf0g(trim)
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
			attest(shared).snap(["~arktype/intersection1cumioo1kp2ufo"])
		})

		it("shares the code two modules write alike only where nothing it holds can be written", () => {
			const definitions = {
				frozen: `type({ at: "string" }).configure({ examples: [{ at: "x" }] })`,
				written: `type({ at: "string" }).configure({ examples: [/a/g, new Date(0)] })`
			}
			const specifiers: Record<string, boolean> = {}
			for (const [name, definition] of Object.entries(definitions)) {
				const source = `import { type } from "arktype"
export const T = ${definition}`
				const files = { "/a.ts": source, "/b.ts": source }
				const precompiler = new Precompiler(memoryHost(files))
				const [a, b] = (["/a.ts", "/b.ts"] as const).map(
					id =>
						/from "(~arktype\/\w+)"/.exec(
							precompiler.precompile(files[id], id).code
						)![1]
				)
				specifiers[name] = a === b
			}
			attest(specifiers).equals({ frozen: true, written: false })
		})

		it("composes a Type's strings from those of the Types it references", () => {
			const files = {
				"/user.ts": `import { type } from "arktype"
export const User = type({ name: "string", nickname: "string | undefined", age: "number.integer >= 0" })`,
				"/team.ts": `import { type } from "arktype"
import { User } from "./user.ts"
export const Team = type({ lead: User, members: User.array() })`
			}
			const precompiler = new Precompiler(memoryHost(files), {
				introspection: ["expression", "description"]
			})
			const user = precompiler.precompile(files["/user.ts"], "/user.ts")
			const team = precompiler.precompile(files["/team.ts"], "/team.ts")
			const composed = Object.entries(team.modules).flatMap(
				([specifier, code]) =>
					(
						/^~arktype\/(expression|description)/.test(specifier) &&
						!user.modules[specifier]
					) ?
						[code]
					:	[]
			)
			attest(composed).snap([
				'import { expressionf96s4u0t43kts } from "~arktype/expressionf96s4u0t43kts"\n\nconst expression14o1jvk02fucdy = (() => {\n\treturn expressionf96s4u0t43kts() + "[]"\n})\n\nexport { expression14o1jvk02fucdy }\n',
				'import { expressionf96s4u0t43kts } from "~arktype/expressionf96s4u0t43kts"\nimport { expression14o1jvk02fucdy } from "~arktype/expression14o1jvk02fucdy"\n\nconst expressiongql45f0mnq5l2 = (() => {\n\treturn "{ lead: " + expressionf96s4u0t43kts() + ", members: " + expression14o1jvk02fucdy() + " }"\n})\n\nexport { expressiongql45f0mnq5l2 }\n',
				'const descriptioncy3zye0b14cgn = (() => {\n\treturn "{ age: an integer and non-negative, name: a string, nickname: a string or undefined }"\n})\n\nexport { descriptioncy3zye0b14cgn }\n',
				'const description162hhmx06ndoqk = (() => {\n\treturn "{ age: number % 1 & >= 0, name: string, nickname: string | undefined }[]"\n})\n\nexport { description162hhmx06ndoqk }\n',
				'import { descriptioncy3zye0b14cgn } from "~arktype/descriptioncy3zye0b14cgn"\nimport { description162hhmx06ndoqk } from "~arktype/description162hhmx06ndoqk"\n\nconst description9qmd8h0zlr276 = (() => {\n\treturn "{ lead: " + descriptioncy3zye0b14cgn() + ", members: " + description162hhmx06ndoqk() + " }"\n})\n\nexport { description9qmd8h0zlr276 }\n'
			])
		})

		it("folds a Module or Scope holding a function or reading an import to a factory", () => {
			const result = precompile(
				`import { scope, type } from "arktype"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
export const Held = type.module({ a: ["string", "=>", trim] })
export const Read = type.module({ a: \`string <= \${max}\` })
export const $ = scope({ a: ["string", "=>", trim] })
export const B = $.type({ b: "a" })`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics).equals([])
			attest(
				result.code.split("\n").filter(line => line.startsWith("export"))
			).snap([
				"export const Held = $arkf1k0gu4008rxk37(trim)",
				"export const Read = $arkf31x3lt13lnlin(max)",
				"export const $ = $arkf16tqm51d9mp98(trim)",
				"export const B = $arkf1tiybtv1jozo2t($)"
			])
		})

		it("folds sites differing only in their Types to calls of one function, passed each Type's index", () => {
			// A and B share the pattern's RegExp, so they're created together
			const result = precompile(`import { scope } from "arktype"
const trim = (s: string) => s.trim()
export const $ = scope({ t: ["string", "=>", trim], s: "/^a/" })
export const A = $.type({ a: "s" })
export const B = $.type({ b: "s" })`)
			attest(result.diagnostics).equals([])
			attest(
				result.code.split("\n").filter(line => line.startsWith("export"))
			).snap([
				"export const $ = $arkfum7tro1c6fvs1(trim)",
				"export const A = $arkf1x4etxi1pkfw5z(0, $)",
				"export const B = $arkf1x4etxi1pkfw5z(1, $)"
			])
		})

		it("folds a TypedFn to a factory receiving its implementation", () => {
			const result = precompile(`import { type } from "arktype"
export const len = type.fn("string", ":", "number")(s => s.length)
export const make = () => type.fn("string")(s => s)`)
			attest(result.diagnostics).equals([])
			attest(
				result.code.split("\n").filter(line => line.startsWith("export"))
			).snap([
				"export const len = $arkfogqwaj0g9p34d(s => s.length)",
				"export const make = () => $arkfrfrs4g1hn9fdv(s => s)"
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
import "~arktype/units/h6eh021988eyz"
import "~arktype/units/nqmgik1kbyfoe"
let def = "string"
def = "number"
export const Trimmed = type("string").pipe(s => s.trim())
export const T = type(def)
import { other } from "./other.ts"`)
			attest(result.diagnostics.map(d => `${d.rule} ${d.severity}`)).snap([
				"R1 warning"
			])
			attest(Object.values(result.modules)[0].split("\n")[0]).snap(
				'import { registerPrecompiledUnits } from "arktype/internal/precompiled.js"'
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

		it("writes units for the Types a Scope exports", () => {
			const unitsOf = (source: string) =>
				Object.keys(
					precompile(
						`import { scope, type } from "arktype"\n${source}`,
						{},
						{ runtime: "arktype" }
					).modules
				).filter(specifier => specifier.startsWith("~arktype/units/"))
			const units = unitsOf(`export const User = type({ name: "string" })`)
			attest(
				unitsOf(`export const $ = scope({ user: { name: "string" } })`)
			).equals(units)
			attest(
				unitsOf(
					`export const types = scope({ user: { name: "string" } }).export()`
				)
			).equals(units)
		})

		it("places the units a module calls in it", () => {
			const lines = precompile(
				`import "./config.ts"
import { type } from "arktype"
export const T = type("string[]")`,
				{},
				{ inline: true, runtime: "arktype" }
			).code.split("\n")
			attest([lines[0], ...lines.slice(-5)]).snap([
				';(({ "registerPrecompiledUnits": registerPrecompiledUnits }) => {',
				"})($ark$0);",
				'import "./config.ts"',
				'import { type } from "arktype"',
				'import * as $ark$0 from "arktype/internal/precompiled.js"',
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
			"/forms.ts":
				'import { type } from "arktype"\nexport function make() {\n\tconst User = type({ name: "string" })\n\treturn { User }\n}',
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
			"/forms.ts true",
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
export const Custom = scope({}, { domain: { description: () => "custom" } }).type({ x: "string" })
export const Default = scope({}).type({ x: "string" })`)
		attest(Object.values(modules)[0].includes('description: "custom"')).equals(
			true
		)
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

	it("writes a Type the same whichever definition reaching its key ran first", () => {
		const files = {
			"/string.ts": `import { type } from "arktype"
export const A = type({ a: "string" })`,
			"/keyof.ts": `import { type } from "arktype"
export const B = type({ a: type({ "[string]": "number" }).keyof() })`
		}
		const first = buildInProcess(files, ["/string.ts", "/keyof.ts"])
		attest(buildInProcess(files, ["/keyof.ts", "/string.ts"])).equals(first)
	})

	it("writes a Type whose meta holds an object the same in any order, though arktype names that object by a count of its process", () => {
		const files = {
			"/a.ts": `import { type } from "arktype"
export const A = type({ a: "number" }).configure({ examples: [{ a: 1 }] })`,
			"/b.ts": `import { type } from "arktype"
export const B = type({ a: "number" }).configure({ examples: [{ a: 2 }] })`
		}
		const together = buildInProcess(files, ["/a.ts", "/b.ts"])
		attest(buildInProcess(files, ["/b.ts", "/a.ts"])).equals(together)
	})
})
