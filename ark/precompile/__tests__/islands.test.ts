import { attest, contextualize } from "@ark/attest"
import { renderDiagnostic } from "@ark/precompile"
import { diagnosticsOf, precompile, statusesOf } from "./utils.ts"

contextualize(() => {
	it("leaves a marked site to arktype", () => {
		const source = `import { type } from "arktype"
import * as ark from "arktype"
export const A = type("string")
// @ark-runtime
export const B = type({ name: process.argv[2] })
export const C = process.argv.length > 2 ?
	// @ark-runtime
	ark.type(process.argv[2])
:	type("number")
// @ark-runtime
export const parsers = { type }`
		attest(statusesOf(source)).snap([
			"3:18 accepted string",
			"5:18 island",
			"8:2 island",
			"9:3 accepted number"
		])
		attest(precompile(source).code).snap(`import "arktype/internal/island.js"
import * as $ark$island from "arktype/internal"
import "arktype"
import { v113ua4m0cbyo2f as $arkv113ua4m0cbyo2f } from "~arktype/r92huo0pyyhua"
import { v16tqm51d9mp98 as $arkv16tqm51d9mp98 } from "~arktype/r92huo0pyyhua"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
import "arktype"
$arkfixConfig()
export const A = /* @__PURE__ */ $arkv113ua4m0cbyo2f()
// @ark-runtime
export const B = $ark$island.type({ name: process.argv[2] })
export const C = process.argv.length > 2 ?
	// @ark-runtime
	$ark$island.type(process.argv[2])
:	$arkv16tqm51d9mp98()
// @ark-runtime
export const parsers = { type: $ark$island.type }`)
	})

	it("links an island reading arktype's namespace as a value", () => {
		attest(
			precompile(`import * as ark from "arktype"
// @ark-runtime
export const lib = { ark, type: ark.type }
export const A = ark.type("string")`).code
		).snap(`import "arktype/internal/island.js"
import * as $ark$island from "arktype/internal"
import * as $ark$arktype from "arktype/internal/arktype.js"
import "arktype"
import { v1k3ai090akbvqv as $arkv1k3ai090akbvqv } from "~arktype/8y795r0xjhl58"
import $arkfixConfig from "~arktype/1c1qm3a0f4lqlh"
// @ark-runtime
export const lib = { ark: $ark$arktype, type: $ark$island.type }
$arkfixConfig()
export const A = /* @__PURE__ */ $arkv1k3ai090akbvqv()`)
	})

	it("reports a site reading a ParseError it didn't throw itself", () => {
		attest(
			diagnosticsOf(`import { generic, type } from "arktype"
const isZero = (n: number) => n === 0
const fns = { f: (s: string) => s.length, g: (s: string) => s.trim() }
// @ark-runtime
const Zero = type("number").narrow(isZero)
// @ark-runtime
const One = type("1").and(Zero)
// @ark-runtime
const M1 = type({ a: type("string").pipe(fns.f) })
// @ark-runtime
const M2 = type({ a: type("string").pipe(fns.g) })
// @ark-runtime
const Both = M1.and(M2)
// @ark-runtime
const G = generic(["t", M1])(["t", "&", M2])
export const FromIsland = type({ a: One })
export const FromIntersection = type({ b: Both })
export const FromGetter = type({ b: G.baseInstantiation as never })`)
		).snap([
			'/main.ts:16:27  type({ a: One }) cannot be precompiled\n  `type({ a: One })` reads a definition that throws a ParseError\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
			'/main.ts:17:33  type({ b: Both }) cannot be precompiled\n  `type({ b: Both })` reads a definition that throws a ParseError\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
			'/main.ts:18:27  type({ b: G.baseInstantiation as never }) cannot be precompiled\n  `type({ b: G.baseInstantiation as never })` reads a definition that throws a ParseError\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".'
		])
	})

	it("reports a factory site reading an island's Type", () => {
		attest(
			precompile(
				`import { type } from "arktype"
import { Imported } from "./b.ts"
// @ark-runtime
export const Trimmed = type("string").pipe(s => s.trim())
export const A = type({ a: Trimmed })
export const B = type({ b: Imported })`,
				{
					"/b.ts": `import { type } from "arktype"
// @ark-runtime
export const Imported = type("string")`
				}
			).diagnostics.map(renderDiagnostic)
		).snap([
			"/main.ts:5:18  type({ a: Trimmed }) can't be precompiled yet\n  `Trimmed` is a runtime island's Type, which a precompiled site can't receive\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\".",
			"/main.ts:6:18  type({ b: Imported }) can't be precompiled yet\n  `Imported` is a runtime island's Type, which a precompiled site can't receive\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
		])
	})

	it("suggests marking a Scope whose thunk returns a Type holding a function", () => {
		const writeSource = (mark: string) => `import { scope } from "arktype"
const isZero = (n: number) => n === 0
${mark}const $ = scope({ zero: () => $.type("number").narrow(isZero) })
${mark}export const types = $.export()`
		const diagnosticsOfMarked = (mark: string) =>
			precompile(writeSource(mark)).diagnostics.map(renderDiagnostic)
		attest(diagnosticsOfMarked("")).snap([
			"/main.ts:4:22  $.export() can't be precompiled yet\n  arktype holds `(n: number) => n === 0` (/main.ts:2:16), which the site reads outside its own source\n  Standalone builds can't precompile a Scope's thunk returning a Type that holds a function or symbol yet. Mark the Scope // @ark-runtime with each definition reading it, or build with runtime: \"arktype\"."
		])
		attest(diagnosticsOfMarked("// @ark-runtime\n")).equals([])
	})

	it("doesn't suggest marking a Scope whose thunk returns a Type arktype can't compile", () => {
		attest(
			precompile(
				`import { $ } from "./scopes.ts"
export const T = $.type(["t", "|", "5n"])`,
				{
					"/scopes.ts": `import { scope } from "arktype"
export const $ = scope({
	b: [["string", "@", "a thing"], "|", "b"],
	t: () => $.type(["b", "@", "a thing"])
})`
				}
			).diagnostics.map(diagnostic => diagnostic.hint)
		).snap([
			'Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
		])
	})

	it("means nothing in cache mode", () => {
		const source = `import { type } from "arktype"
// @ark-runtime
export const A = type({ name: process.argv[2] })`
		attest(statusesOf(source, {}, { runtime: "arktype" })).snap([
			"3:18 rejected\n  `process` is a global the build does not read"
		])
		attest(
			precompile(source, {}, { runtime: "arktype" }).code.includes("island")
		).equals(false)
	})

	it("marks what follows it", () => {
		attest(
			statusesOf(`import { type } from "arktype"
// @ark-runtime
// a comment between the marker and the site
export const A = type("string")
export const B = type({
	// @ark-runtime
	name: "string"
})
export const C = type("number") // @ark-runtime
export const D = type("boolean")`)
		).snap([
			"4:18 island",
			"5:18 accepted { name: string }",
			"9:18 accepted number",
			"10:18 island"
		])
	})

	it("lets code outside it read what its Type has", () => {
		attest(
			diagnosticsOf(`import { type } from "arktype"
// @ark-runtime
const T = type({ a: "string" })
const { in: I } = T
console.log(I.expression)`)
		).snap([])
	})

	it("lets an island read what configure() returns", () => {
		attest(
			diagnosticsOf(
				`import { type } from "arktype"
import { config } from "./config.ts"
// @ark-runtime
export const T = type("number").describe(config.keywords.string.description)`,
				{
					"/config.ts": `import { configure } from "arktype/config"
export const config: any = configure({ keywords: { string: { description: "text" } } })`
				},
				{ config: "/config.ts" }
			)
		).equals([])
	})

	it("fails for what an island reads that the build precompiles", () => {
		attest(
			diagnosticsOf(
				`import { type } from "arktype"
import { Base, makeId, makeName } from "./b.ts"
import * as b from "./b.ts"
export const User = type({ name: "string" })
// @ark-runtime
export const Admin = User.and({ role: process.argv[2] })
// @ark-runtime
export const Parsed = type("string").pipe(s => User.assert(JSON.parse(s)))
// @ark-runtime
export const Named = makeName(process.argv[2])
// @ark-runtime
export const Identified = makeId(process.argv[2])
// @ark-runtime
export const Extended = Base.and({ role: process.argv[2] })
// @ark-runtime
export const Wrapped = type({ shared: b.Shared, name: process.argv[2] })`,
				{
					"/b.ts": `import { type } from "arktype"
export const makeName = (def: string) => type({ name: def })
export const makeId = (def: string) =>
	// @ark-runtime
	type({ id: def })
// @ark-runtime
export const Base = type({ name: process.argv[2] })
export const Shared = type("string")`
				}
			)
		).snap([
			'/b.ts:2:42  `type` is arktype/runtime\'s outside a runtime island\n  the runtime island at /main.ts:10:1 reaches it through `makeName` (/b.ts:2:14)\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/main.ts:6:22  `User` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/main.ts:16:39  `b.Shared` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".'
		])
	})

	it("fails for a precompiled Type it reads through a cast or an object literal", () => {
		attest(
			diagnosticsOf(
				`import * as b from "./b.ts"
import { schemas } from "./b.ts"
// @ark-runtime
export const A = (b as typeof b).Shared.or("null")
// @ark-runtime
export const B = schemas.User.or("null")`,
				{
					"/b.ts": `import { type } from "arktype"
export const Shared = type("string")
const User = type({ name: "string" })
export const schemas = { User }`
				}
			)
		).snap([
			'/main.ts:4:18  `(b as typeof b).Shared` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/b.ts:4:26  `User` is a precompiled validator, which a runtime island can only validate with\n  the runtime island at /main.ts:6:1 reaches it through `schemas` (/b.ts:4:14)\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".'
		])
	})
})
