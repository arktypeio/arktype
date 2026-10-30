import { attest, contextualize } from "@ark/attest"
import { renderDiagnostic } from "@ark/aot"
import { diagnosticsOf, normalized, precompile, statusesOf } from "./utils.ts"

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
		attest(normalized(precompile(source).code))
			.snap(`import "arktype/internal/island.js"
import * as $ark$island from "arktype/internal"
import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import { #2 as $ark#2 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#3"
$arkfixConfig()
export const A = /* @__PURE__ */ $ark#0()
// @ark-runtime
export const B = $ark$island.type({ name: process.argv[2] })
export const C = process.argv.length > 2 ?
	// @ark-runtime
	$ark$island.type(process.argv[2])
:	$ark#2()
// @ark-runtime
export const parsers = { type: $ark$island.type }`)
	})

	it("links an island reading arktype's namespace as a value", () => {
		attest(
			normalized(
				precompile(`import * as ark from "arktype"
// @ark-runtime
export const lib = { ark, type: ark.type }
export const A = ark.type("string")`).code
			)
		).snap(`import "arktype/internal/island.js"
import * as $ark$island from "arktype/internal"
import * as $ark$arktype from "arktype/internal/arktype.js"
import "arktype"
import { #0 as $ark#0 } from "~arktype/#1"
import $arkfixConfig from "~arktype/#2"
// @ark-runtime
export const lib = { ark: $ark$arktype, type: $ark$island.type }
$arkfixConfig()
export const A = /* @__PURE__ */ $ark#0()`)
	})

	it("reports a site reading another's ParseError", () => {
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
export const FromGetter = type({ b: G.baseInstance as never })`)
		).snap([
			"/main.ts:16:27  type({ a: One }) cannot be precompiled\n  `type({ a: One })` reads a definition that throws a ParseError\n  Fix the definition it reads, which throws the same ParseError at runtime.",
			"/main.ts:17:33  type({ b: Both }) cannot be precompiled\n  `type({ b: Both })` reads a definition that throws a ParseError\n  Fix the definition it reads, which throws the same ParseError at runtime.",
			"/main.ts:18:27  type({ b: G.baseInstance as never }) cannot be precompiled\n  `type({ b: G.baseInstance as never })` reads a definition that throws a ParseError\n  Fix the definition it reads, which throws the same ParseError at runtime."
		])
	})

	it("reports a site reading an island's Type, as bound rather than as equal", () => {
		attest(
			precompile(
				`import { type } from "arktype"
import { Imported } from "./b.ts"
// @ark-runtime
export const Trimmed = type("string").pipe(s => s.trim())
// equal to Imported, but bound outside an island
const Static = type("string")
const Alias = Imported
export const A = type({ a: Trimmed })
export const B = type({ b: Alias, c: Static })`,
				{
					"/b.ts": `import { type } from "arktype"
// @ark-runtime
export const Imported = type("string")`
				}
			).diagnostics.map(renderDiagnostic)
		).snap([
			"/main.ts:8:18  type({ a: Trimmed }) can't be precompiled yet\n  `Trimmed` is a runtime island's Type, which a precompiled site can't receive\n  Precompile `Trimmed` too, by removing its // @ark-runtime where the build can, or mark this definition // @ark-runtime as well.",
			"/main.ts:9:18  type({ b: Alias, c: Static }) can't be precompiled yet\n  `Imported` is a runtime island's Type, which a precompiled site can't receive\n  Precompile `Imported` too, by removing its // @ark-runtime where the build can, or mark this definition // @ark-runtime as well."
		])
	})

	it("marking a Scope leaves its thunks to arktype", () => {
		const writeSource = (mark: string) => `import { scope } from "arktype"
const isZero = (n: number) => n === 0
${mark}const $ = scope({ zero: () => $.type("number").narrow(isZero) })
${mark}export const types = $.export()`
		const diagnosticsOfMarked = (mark: string) =>
			precompile(writeSource(mark)).diagnostics.map(renderDiagnostic)
		attest(diagnosticsOfMarked("")).snap([
			'/main.ts:3:11  scope({ zero: () => $.type("number").narrow(isZero) }) is left to arktype\n  $.export() (/main.ts:4:22) reads `$` but isn\'t precompiled, so arktype must define `$` for it',
			"/main.ts:4:22  $.export() can't be precompiled yet\n  the site's value holds `(n: number) => n === 0` (/main.ts:2:16), which it reads outside its own source\n  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime."
		])
		attest(diagnosticsOfMarked("// @ark-runtime\n")).equals([])
	})

	it("means nothing in cache mode", () => {
		const source = `import { type } from "arktype"
// @ark-runtime
export const A = type({ name: process.argv[2] })`
		attest(statusesOf(source, {}, { runtime: "arktype" })).snap([
			"3:18 rejected\n  `process` is a global the build does not read"
		])
		attest(precompile(source, {}, { runtime: "arktype" }).code)
			.snap(`import { type } from "arktype"
// @ark-runtime
export const A = type({ name: process.argv[2] })`)
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

	it("fails for a marker that leaves nothing to arktype", () => {
		attest(
			diagnosticsOf(`import { type } from "arktype"
// @ark-runtime
const x = 1
export const A = type({
	// @ark-runtime
	a: type("string")
})
export const B = type("number")
// @ark-runtime`)
		).snap([
			"/main.ts:3:1  `const x = 1` is marked // @ark-runtime but doesn't use arktype\n  Put // @ark-runtime right before a definition arktype should run, or remove it.",
			'/main.ts:6:2  `a: type("string")` is marked // @ark-runtime inside a definition the build precompiles\n  Put // @ark-runtime right before a definition arktype should run, or remove it.',
			"/main.ts:9:1  `// @ark-runtime` marks nothing\n  Put // @ark-runtime right before a definition arktype should run, or remove it."
		])
	})

	it("lets an island read what configure() returns, and code outside it read what its Type has", () => {
		attest(
			diagnosticsOf(
				`import { type } from "arktype"
import { config } from "./config.ts"
// @ark-runtime
export const T = type("number").describe(config.keywords.string.description)
// @ark-runtime
const U = type({ a: "string" })
const { in: I } = U
console.log(I.expression)`,
				{
					"/config.ts": `import { configure } from "arktype/config"
export const config: any = configure({ keywords: { string: { description: "text" } } })`
				},
				{ config: "/config.ts" }
			)
		).equals([])
	})

	it("fails for what an island reads that the build precompiles, through casts or literals too", () => {
		attest(
			diagnosticsOf(
				`import { type } from "arktype"
import { Base, makeId, makeName, schemas } from "./b.ts"
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
export const Wrapped = type({ shared: b.Shared, name: process.argv[2] })
// @ark-runtime
export const Cast = (b as typeof b).Shared.or("null")
// @ark-runtime
export const Literal = schemas.User.or("null")`,
				{
					"/b.ts": `import { type } from "arktype"
export const makeName = (def: string) => type({ name: def })
export const makeId = (def: string) =>
	// @ark-runtime
	type({ id: def })
// @ark-runtime
export const Base = type({ name: process.argv[2] })
export const Shared = type("string")
const User = type({ name: "string" })
export const schemas = { User }`
				}
			)
		).snap([
			'/b.ts:2:42  `type` is arktype/runtime\'s outside a runtime island\n  the runtime island at /main.ts:10:1 reaches it through `makeName` (/b.ts:2:14)\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/main.ts:6:22  `User` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/b.ts:10:26  `User` is a precompiled validator, which a runtime island can only validate with\n  the runtime island at /main.ts:20:1 reaches it through `schemas` (/b.ts:10:14)\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/main.ts:16:39  `b.Shared` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/main.ts:18:21  `(b as typeof b).Shared` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".'
		])
	})
})
