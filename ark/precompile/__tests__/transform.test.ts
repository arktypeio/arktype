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
import { vzvq2oze5lr as $arkvzvq2oze5lr } from "~arktype/1kf92807qsn"
import { v22ro8s3uuz as $arkv22ro8s3uuz } from "~arktype/1kf92807qsn"
import { v148ig5g1uwr as $arkv148ig5g1uwr } from "~arktype/1kf92807qsn"
const max = 64
export const User = $arkvzvq2oze5lr()
export const Same = $arkv22ro8s3uuz()
export const Users = $arkv148ig5g1uwr()
export const isError = (data: unknown) => data instanceof ArkErrors`)
			attest(Object.keys(result.modules)).snap(["~arktype/1kf92807qsn"])
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
import { v2e1m8qabj8c as $arkv2e1m8qabj8c } from "~arktype/cziklceujk"
import * as config from "./config.ts"
export const A = $arkv2e1m8qabj8c()`)
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
export const G = type("string").description`,
				{ "/limits.ts": "export const max = 5" }
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:8:18  type(\"strin\") throws a ParseError\n  'strin' is unresolvable\n  The precompiled site throws the same ParseError when it is created.",
				'/main.ts:9:18  type({ "+": "delete", "[string]": "string", a: "\'a\'" }) can\'t be precompiled to a standalone validator yet\n  structure { [string]: string, a: "a", + (undeclared): delete } can\'t be precompiled to a standalone validator\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
				'/main.ts:11:18  type("string").description can\'t be precompiled to a standalone validator yet\n  its value is not a Type, Module, Scope or Generic\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".'
			])
			attest(result.code).snap(`import { type } from "arktype"
import { f11rmdvxwrkb as $arkf11rmdvxwrkb } from "~arktype/21o990s5em7"
import { f20bdtc14r0x as $arkf20bdtc14r0x } from "~arktype/21o990s5em7"
import { v18f1a6ngbuy as $arkv18f1a6ngbuy } from "~arktype/21o990s5em7"
import { v1pbxisbfbpm as $arkv1pbxisbfbpm } from "~arktype/21o990s5em7"
import $ark11nyj35o0sh from "~arktype/26nq08t1bi4"
import { max } from "./limits.ts"
const trim = (s: string) => s.trim()
const field = (n: number) => type(\`string <= \${n}\`)
export const A = $arkf11rmdvxwrkb(trim)
export const B = $arkf20bdtc14r0x(max)
export const C = $arkv18f1a6ngbuy()
export const D = $ark11nyj35o0sh()
export const E = type({ "+": "delete", "[string]": "string", a: "'a'" })
export const F = $arkv1pbxisbfbpm()
export const G = type("string").description`)
		})

		it("folds Modules", () => {
			const result = precompile(`import { scope, type } from "arktype"
export const types = scope({ tree: { value: "number", "children?": "tree[]" } }).export()
export const M = type.module({ a: "string", b: { c: "a" } })`)
			attest(result.diagnostics).equals([])
			attest(result.code).snap(`import "arktype"
import { v2f0bhdcpikw as $arkv2f0bhdcpikw } from "~arktype/1ot217wow9f"
import { v209i2jspcoq as $arkv209i2jspcoq } from "~arktype/1ot217wow9f"
export const types = $arkv2f0bhdcpikw()
export const M = $arkv209i2jspcoq()`)
			attest(
				Object.values(result.modules)[0]
					.split("\n")
					.filter(line => /^const module\d/.test(line))
			).snap([
				'const module0 = runtime.freeze({ ["tree"]: validator0 })',
				'const module1 = runtime.freeze({ ["a"]: validator1, ["b"]: validator2 })'
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
import { v207w5kbsr5e as $arkv207w5kbsr5e } from "~arktype/1obqhkophko"
import { vehauhbipgw as $arkvehauhbipgw } from "~arktype/1obqhkophko"
import { v148ig5g1uwr as $arkv148ig5g1uwr } from "~arktype/1obqhkophko"
import { v1s13ylwl1x9 as $arkv1s13ylwl1x9 } from "~arktype/1obqhkophko"
import { v19p2bcm49l4 as $arkv19p2bcm49l4 } from "~arktype/1obqhkophko"
const $ = $arkv207w5kbsr5e()
export const types = $arkvehauhbipgw()
export const Tree = $arkv148ig5g1uwr()
export const Box = $arkv1s13ylwl1x9()
export const BoxedTree = $arkv19p2bcm49l4()`)
			attest(
				Object.values(result.modules)[0]
					.split("\n")
					.filter(line => /^const (unavailable|module)\d/.test(line))
			).snap([
				'const unavailable0 = runtime.unavailableScope("the Scope at /main.ts:2:11")',
				'const unavailable1 = runtime.unavailableGeneric("the Generic box at /main.ts:3:22")',
				'const unavailable2 = runtime.unavailableGeneric("the Generic at /main.ts:5:20")',
				'const module0 = runtime.freeze({ ["tree"]: validator0, ["box"]: unavailable1 })'
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
import { v2z182cdbhc as $arkv2z182cdbhc } from "~arktype/dzav457x2v"
import { v11a751fkv8g as $arkv11a751fkv8g } from "~arktype/dzav457x2v"
const create = () => {
	const $ = $arkv2z182cdbhc()
	const types = $arkv11a751fkv8g()
	return types
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
import { f1zfc4jvopxh as $arkf1zfc4jvopxh } from "~arktype/1131vno8ya7"
import { fujb2tq68ew as $arkfujb2tq68ew } from "~arktype/1131vno8ya7"
import { fyhi0i9lyrd as $arkfyhi0i9lyrd } from "~arktype/1131vno8ya7"
import { f1u6d12e2tku as $arkf1u6d12e2tku } from "~arktype/1131vno8ya7"
import { f1wp1un5l57h as $arkf1wp1un5l57h } from "~arktype/1131vno8ya7"
import { f1qr3n92up8j as $arkf1qr3n92up8j } from "~arktype/1131vno8ya7"
import { fhcw8rg5ps0 as $arkfhcw8rg5ps0 } from "~arktype/1131vno8ya7"
import { fexpx5piaav as $arkfexpx5piaav } from "~arktype/1131vno8ya7"
import { ext } from "./ext.ts"
const trim = (s: string) => s.trim()
class Pet {}
const petTag = Symbol("petTag")
export const Name = $arkf1zfc4jvopxh(trim, (s, ctx) => s.length > 0)
export const User = $arkfujb2tq68ew(Name, Pet, petTag)
export const Either = $arkfyhi0i9lyrd(trim)
export const Extended = $arkf1u6d12e2tku(ext)
export const Pair = $arkf1wp1un5l57h(Name, Either)
export const Short = $arkf1qr3n92up8j(Name, s => s.length < 9)
export const Stamped = $arkfhcw8rg5ps0(() => new Date())
class Kitten extends Pet {}
export const Kept = $arkfexpx5piaav(Pet, Kitten)`)
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
import { f19cnbo9pame as $arkf19cnbo9pame } from "~arktype/22qwbioebx2"
import { f1uslk6cbzgz as $arkf1uslk6cbzgz } from "~arktype/22qwbioebx2"
import { f20bd0we3n85 as $arkf20bd0we3n85 } from "~arktype/22qwbioebx2"
import { f12afweyjfd6 as $arkf12afweyjfd6 } from "~arktype/22qwbioebx2"
import { fzp95xqs0o7 as $arkfzp95xqs0o7 } from "~arktype/22qwbioebx2"
import { f1kdxkkysgwf as $arkf1kdxkkysgwf } from "~arktype/22qwbioebx2"
import { max } from "./limits.ts"
import { reboxed } from "./reboxed.ts"
import { shape } from "./shapes.ts"
import * as limits from "./limits.ts"
const trim = (s: string) => s.trim()
const o = { name: "string", tags: ["string"] }
const alias = o
export const Local = $arkf19cnbo9pame(trim, o)
export const Imported = $arkf1uslk6cbzgz(max, o)
export const Added = $arkf20bd0we3n85(reboxed)
export const Defined = $arkf12afweyjfd6(process.env.NODE_ENV)
export const Namespaced = $arkfzp95xqs0o7(limits.boxed)
const box = shape
export const Imports = ((shape: number) => $arkf1kdxkkysgwf($arki15vt9rj2an1, box))(1)
export const Shadowed = (() => {
	const o = 1
	return type(alias.name)
})()
import { shape as $arki15vt9rj2an1 } from "./shapes.ts"`)
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
import $arka9il3vu75e from "~arktype/16ceueuzjpy"
import { f138cuyahcas as $arkf138cuyahcas } from "~arktype/1hxv4z1mwzf"
import { f1n3watygaq6 as $arkf1n3watygaq6 } from "~arktype/1hxv4z1mwzf"
import { f24xhxa0z6zi as $arkf24xhxa0z6zi } from "~arktype/1hxv4z1mwzf"
import { f2b24cuxkzkc as $arkf2b24cuxkzkc } from "~arktype/1hxv4z1mwzf"
import { fe7cggf8nto as $arkfe7cggf8nto } from "~arktype/1hxv4z1mwzf"
import $arkwwpq820n77 from "~arktype/pospw2b739"
import { extend } from "./extend.ts"
const isZero = (n: number) => n === 0
class Cat {}
class Dog {}
extend(Dog, Cat)
export const Narrowed = type("1").narrow(isZero)
export const Anonymous = type("1").narrow(n => n === 0)
export const Both = type.instanceOf(Dog).and(type.instanceOf(Cat))
export const Unrelated = $arka9il3vu75e()
const isNegative = (n: number) => n < 0
const Negative = $arkf138cuyahcas(isNegative)
const DogT = $arkf1n3watygaq6(Dog)
const CatT = $arkf24xhxa0z6zi(Cat)
const fns = { f: (s: string) => s.length, g: (s: string) => s.trim() }
const M1 = $arkf2b24cuxkzkc(fns.f)
const M2 = $arkfe7cggf8nto(fns.g)
export const Referenced = type("1").and(Negative)
export const BothReferenced = DogT.and(CatT)
export const Morphs = M1.and(M2)
const negative = () => Negative
const dog = () => DogT
export const Helped = type("1").and(negative())
export const HelpedClass = type.instanceOf(Error).and(dog())
export const Scoped = scope({ a: DogT, b: "a & Error" }).export()
export const Props = $arkwwpq820n77()
export const NarrowedProps = type("number").narrow(isNegative).props`)
			attest(result.modules["~arktype/16ceueuzjpy"])
				.snap(`import * as runtime from "arktype/runtime"

function throwParseError() {
	runtime.fixConfig()
	throw new runtime.ParseError("Intersection of 1 and 2 results in an unsatisfiable type")
}

export { throwParseError as default }
`)
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
import { f3ztwe52hlc as $arkf3ztwe52hlc } from "~arktype/26mn4hcoci4"
import { f20bdtc14r0x as $arkf20bdtc14r0x } from "~arktype/26mn4hcoci4"
import { fomeifcka3x as $arkfomeifcka3x } from "~arktype/26mn4hcoci4"
import single, { list } from "./helpers.ts"
import * as helpers from "./helpers.ts"
const own = (def: string) => list(def)
export const List = $arkf3ztwe52hlc(list)
export const Own = $arkf20bdtc14r0x(list)
export const Optional = $arkfomeifcka3x(helpers.optional, $arki1hye78qyfa1)
export const Single = type(single("string"))
import { suffix as $arki1hye78qyfa1 } from "./suffix.ts"`)
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
import { f1c4z649gk1t as $arkf1c4z649gk1t } from "~arktype/18chqtlsbh1"
import { f1jb9nbu9m8n as $arkf1jb9nbu9m8n } from "~arktype/18chqtlsbh1"
import { f1idhf3zei8v as $arkf1idhf3zei8v } from "~arktype/18chqtlsbh1"
import { a } from "./a.ts"
import { alias } from "./b.ts"
const fns = { check: (s: string) => s.length > 3 }
const other = { check: fns.check }
const Name = $arkf1c4z649gk1t(fns.check)
export const Aliased = $arkf1jb9nbu9m8n(a, alias)
export const Checked = $arkf1idhf3zei8v(other.check, fns.check, Name)`)
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
import { f5pa45p0hg4 as $arkf5pa45p0hg4 } from "~arktype/e0evt6em08"
import { f1qyzy7utyf9 as $arkf1qyzy7utyf9 } from "~arktype/e0evt6em08"
import { f3ji8bam7dl as $arkf3ji8bam7dl } from "~arktype/e0evt6em08"
const tag = Symbol("tag")
const T = $arkf5pa45p0hg4(tag)
export const Union = $arkf1qyzy7utyf9(T)
export const In = $arkf3ji8bam7dl(T)`)
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
import { fnwuv001o8a as $arkfnwuv001o8a } from "~arktype/1r7sdvcvzfs"
import { fyn4lizp57k as $arkfyn4lizp57k } from "~arktype/1r7sdvcvzfs"
import { f1k2jbc8zx4u as $arkf1k2jbc8zx4u } from "~arktype/1r7sdvcvzfs"
import { f223z3o8tm04 as $arkf223z3o8tm04 } from "~arktype/1r7sdvcvzfs"
import { f27ogog5z6o5 as $arkf27ogog5z6o5 } from "~arktype/1r7sdvcvzfs"
const isLong = (s: string) => s.length > 1
const isShort = (s: string) => s.length < 3
const h = isLong
const fns = { isLong }
const shorts = () => [isShort]
const Long = $arkfnwuv001o8a(isLong)
const N = $arkfyn4lizp57k(isShort)
const longs = () => [Long]
export const Mapped = $arkf1k2jbc8zx4u(isLong)
export const Shadowed = type([type("string").narrow(h), ...shorts().map(h => type("string").narrow(h))] as never)
export const Renamed = type(Object.values(fns).map(h => type("string").narrow(h)) as never)
export const Through = type(longs().map(N => type({ n: N })) as never)
export const Either = type(shorts().map(h => type("string").narrow(h || isLong)) as never)
export const Own = $arkf223z3o8tm04(function (this: unknown, s) { return s.length > 1 && !this })
export const OwnFirst = $arkf27ogog5z6o5(function (this: unknown, s) { return this === undefined && s.length > 1 })`)
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
export const Held = trimmed().and(second())`
			)
			attest(result.diagnostics.map(renderDiagnostic)).snap([
				"/main.ts:10:21  trimmed().and(second()) can't be precompiled to a standalone validator yet\n  arktype holds `(s: string) => s.trim()` (/main.ts:2:14), which the site cannot pass to its factory\n  Standalone builds can't precompile every definition yet. Build with runtime: \"arktype\"."
			])
			attest(result.code).snap(`import "arktype"
import { v14kicz05lle as $arkv14kicz05lle } from "~arktype/1tf259vxgwi"
import { v1tqcuiwoyw9 as $arkv1tqcuiwoyw9 } from "~arktype/1tf259vxgwi"
import { f162fotcpngg as $arkf162fotcpngg } from "~arktype/1tf259vxgwi"
import { v26dtsitbpru as $arkv26dtsitbpru } from "~arktype/1tf259vxgwi"
const trim = (s: string) => s.trim()
const A = $arkv14kicz05lle()
const B = $arkv1tqcuiwoyw9()
const Trimmed = $arkf162fotcpngg(trim)
const first = () => A
const second = () => B
const trimmed = () => Trimmed
export const Both = $arkv26dtsitbpru()
export const Held = trimmed().and(second())`)
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
import "~arktype/units/1japii3t7y8"
let def = "string"
def = "number"
export const Trimmed = type("string").pipe(s => s.trim())
export const T = type(def)
import { other } from "./other.ts"`)
			attest(result.diagnostics.map(d => `${d.rule} ${d.severity}`)).snap([
				"R1 warning"
			])
			attest(result.modules["~arktype/units/1japii3t7y8"].split("\n")[0]).snap(
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
			attest(result.code).satisfies(/export const User = \$ark\w+\(\)\n/)
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
				'return { "default": throwParseError }',
				"})($ark$0))",
				"}",
				"function $ark29kiraik2u5(...args) {",
				'return $ark$load1()["default"](...args)',
				"}",
				"$ark$load1();",
				'import "arktype"',
				'import * as $ark$0 from "arktype/runtime"',
				'const Array = "shadowed"',
				"export const T = $arkvk7v7o06cb9()",
				"export const E = $ark29kiraik2u5()"
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
