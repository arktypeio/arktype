import { attest, contextualize } from "@ark/attest"
import { inputsOf } from "./utils.ts"

contextualize(() => {
	it("assigned to another binding", () => {
		attest(
			inputsOf(`import { type } from "arktype"
const o = { a: "string" }
let p: any
p = o
p.a = "number"
export const T = type(o.a)`)
		).snap([["6:18 accepted", "local o.a"]])
	})

	it("passed to its own methods", () => {
		const uses = [
			"`${o}`",
			'o + ""',
			"+o",
			"mutate`${o}`",
			"o instanceof X",
			"o.valueOf()",
			"JSON.stringify(o)"
		]
		attest(
			uses.map(
				use =>
					inputsOf(`import { type } from "arktype"
const o = { a: "string", toString() { return "" } }
const mutate = (strings: TemplateStringsArray, x: any) => { x.a = "number" }
class X { static [Symbol.hasInstance](v: any) { return true } }
${use}
export const T = type(o.a)`)[0][1]
			)
		).snap([
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a"
		])
	})

	it("a method called through `as`, `!` or optional chaining", () => {
		attest(
			["(o.f as any)()", "o.f!()", "(o?.f)()"].map(
				use =>
					inputsOf(`import { type } from "arktype"
const o = { a: "string", f() { (this as any).a = "number" } }
;${use}
export const T = type(o.a)`)[0][1]
			)
		).snap(["local o.a", "local o.a", "local o.a"])
	})

	it("methods Object.prototype defines", () => {
		attest(
			[
				`const p: any = o.valueOf()
p.a = "number"`,
				`;(o.n.valueOf() as any).a = "number"`,
				`;(o.l.valueOf() as any)[0] = "number"`
			].map(use =>
				inputsOf(`import { type } from "arktype"
const o = { a: "string", n: { a: "string" }, l: ["string"] }
${use}
export const T = type(o.a + o.n.a + o.l[0])`).pop()
			)
		).snap([
			["5:18 accepted", "local o.a", "local o.n.a", "local o.l.0"],
			["4:18 accepted", "local o.a", "local o.n.a", "local o.l.0"],
			["4:18 accepted", "local o.a", "local o.n.a", "local o.l.0"]
		])
	})

	it("data has no methods of its own", () => {
		attest(
			inputsOf(`import { type } from "arktype"
const o = { a: "string", b: ["x"] }
const a = \`\${o}\`
const b = o + ""
const c = JSON.stringify(o)
const d = o.b.slice(1).join("|")
const e = Object.keys(o).length
export const T = type(o.a)`)
		).snap([["8:18 accepted"]])
	})

	it("arguments of a helper", () => {
		attest(
			[
				`function h(this: void, p: any) { return (p.a = "number") }
h(o)`,
				`function h(p: any, q: any) { return (p.a = "number"), q }
h(...[], o)`,
				`const h = (p: any) => ((p ||= {}).a = "number")
h(o)`,
				`const h = (p: any) => ((p ??= {}).a = "number")
h(o)`
			].map(use =>
				inputsOf(`import { type } from "arktype"
const o = { a: "string" }
${use}
export const T = type(o.a)`).pop()
			)
		).snap([
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"]
		])
	})

	it("arguments of a function", () => {
		attest(
			inputsOf(`import { type } from "arktype"
const o = { a: "string" }
function f(x: unknown) { return (arguments[0].a = "number") }
f(o)
export const T = type(o.a)`)
		).snap([["5:18 accepted", "local o.a"]])
		attest(
			inputsOf(`import { type } from "arktype"
const o = { a: "string" }
function h(x: unknown, d = (arguments[0].a = "number")) { return 1 }
h(o)
export const T = type(o.a)`)
		).snap([["5:18 accepted", "local o.a"]])
	})

	it("callbacks and containers", () => {
		const uses = [
			`const f = (x: any) => (x.a = "number")
;[o].map(f)`,
			`function f(x: any) { x.a = "number" }
Array.from([o], f)`,
			`const g = (acc: any, x: any) => ((x.a = "number"), acc)
;[o].reduce(g, 0)`,
			`;[o].map(function () { arguments[0].a = "number" })`,
			`Array.from([0], function (this: any) { this.a = "number" }, o)`,
			`function f(this: any, x: any, i: any, d = (this.a = "number")) {}
Array.from([0], f, o)`,
			`const w = { o, map() { (this as any).o.a = "number" } }
w.map()`,
			`;\`\${{ o, toString() { (this as any).o.a = "number"; return "" } }}\``,
			`;({ ...{ o, get x() { (this as any).o.a = "number"; return 1 } } })`,
			`Object.values({ o, get x() { (this as any).o.a = "number"; return 1 } })`,
			`JSON.stringify({ o, toJSON() { (this as any).o.a = "number"; return 1 } })`,
			`;[{ o, toString() { (this as any).o.a = "number"; return "" } }].join()`
		]
		attest(
			uses.map(use =>
				inputsOf(`import { type } from "arktype"
const o = { a: "string" }
${use}
export const T = type(o.a)`).pop()
			)
		).snap([
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"]
		])
	})

	it("calls into arktype that run user code", () => {
		const uses = [
			`const D = type("unknown").narrow((x: any) => ((x.a = "number"), true))
D(o)`,
			`const D = type("unknown").narrow((x: any) => ((x.a = "number"), true))
D.assert(o)`,
			`const A = type("string")
;(A as any).constructor.constructor("o", "o.a = 'number'")(o)`,
			`const D = type("unknown").narrow((x: any) => ((x.a = "number"), true))
;(D as any).traverseAllows(o)`,
			`const D = type("unknown").narrow((x: any) => ((x.a = "number"), true))
D.internal.traverseAllows(o, undefined as never)`,
			`const D = type("unknown").pipe((x: any) => ((x.a = "number"), x))
;(D as any).traverseApply(o, { queueMorphs() {}, hasError: () => false })`
		]
		attest(
			uses.map(use =>
				inputsOf(`import { type } from "arktype"
const o: any = { a: "string" }
${use}
export const T = type(o.a)`).pop()
			)
		).snap([
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"]
		])
	})

	it("calls into arktype that keep or return their argument", () => {
		const uses = [
			`const d: any = type.define(o)
d.a = "number"`,
			`;(scope.define(o) as any).a = "number"`,
			`;((scope({ b: "string" }) as any).defineSchema(o) as any).a = "number"`,
			`const s = scope({ x: o })
;(s as any).aliases.x.a = "number"`,
			`const $ = type.module({ x: o, b: "string" })
;($.b as any).$.aliases.x.a = "number"`,
			`const U = type.unit(o)
;(U as any).unit.a = "number"`,
			`const U = type("===", o)
;(U as any).unit.a = "number"`,
			`const U = type({ x: ["===", o] })
;(U as any).get("x").unit.a = "number"`,
			`const M = type(["string", "@", { o }])
;(M as any).meta.o.a = "number"`,
			`const M = type("string").configure({ o } as any)
;(M as any).meta.o.a = "number"`,
			`const G = type("<t>", { x: "t", o })
;(G as any).bodyDef.o.a = "number"`
		]
		attest(
			uses.map(
				use =>
					inputsOf(`import { type, scope } from "arktype"
const o = { a: "string" }
${use}
export const T = type(o.a)`).pop()![1]
			)
		).snap([
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a",
			"local o.a"
		])
		attest(
			inputsOf(`import { type } from "arktype"
const o = { a: "string", b: ["===", { c: 1 }] }
const A = type({ b: o.b })
;(A as any).get("b").unit.c = 2
export const T = type(o.a)`).pop()
		).snap(["5:18 accepted", "local o.a"])
	})

	it("calls into arktype that parse and keep nothing", () => {
		attest(
			inputsOf(`import { type, scope } from "arktype"
const o = { a: "string", b: "number" }
const A = type({ x: o, y: [o, "[]"], z: ["string", "@", "a string"] })
const B = type(o).and(o).or({ ...o }).merge(o).pick("a")
const C = type.or(o, o.a).extends(o)
const D = scope({ x: "string" }).type("<t>", "t").internal
const E = type.Record("string", o)
export const T = type(o.a)`).pop()
		).snap(["8:18 accepted"])
	})

	it("results of arktype methods", () => {
		attest(
			[
				`;(s.export().sub as any).a = type("number")`,
				`;((s.export() as any).sub.$.export().sub as any).a = type("number")`
			].map(use =>
				inputsOf(`import { type, scope } from "arktype"
const s = scope({ sub: type.module({ a: "string" }) })
${use}
export const T = type({ x: s.export().sub.a })`).pop()
			)
		).snap([
			["4:18 accepted", "local s"],
			["4:18 accepted", "local s"]
		])
		attest(
			inputsOf(`import { type, scope } from "arktype"
const $ = scope({ sub: type.module({ a: "string" }), b: "string" }).export()
;(($.b as any).$.export().sub as any).a = type("number")
export const T = type({ x: $.sub.a })`).pop()
		).snap(["4:18 accepted", "local $.sub.a"])
		attest(
			inputsOf(`import { type, scope } from "arktype"
const $ = scope({ a: "string" }).export()
const A = $.a.array()
const ok = $.a.allows("x")
const out = $.a("x")
export const T = type({ x: $.a })`).pop()
		).snap(["6:18 accepted"])
	})

	it("the value of an assignment", () => {
		attest(
			["=", "??="].map(
				operator =>
					inputsOf(`import { type } from "arktype"
const o = { a: "string" }
let p: any
const q: any = (p ${operator} o)
q.a = "number"
export const T = type(o.a)`)[0]
			)
		).snap([
			["6:18 accepted", "local o.a"],
			["6:18 accepted", "local o.a"]
		])
	})

	it("modules", () => {
		attest(
			inputsOf(`import { type, scope } from "arktype"
const $ = scope({ a: "string" }).export()
;($ as any).a = type("number")
export const T = type({ x: $.a })`)
		).snap([
			["2:11 accepted"],
			["3:17 accepted"],
			["4:18 accepted", "local $.a"]
		])
		attest(
			inputsOf(`import { type, scope } from "arktype"
const $ = scope({ a: "string" }).export()
Object.assign($ as any, { b: type("number") })
export const T = type({ ...$ } as any)`)
		).snap([["2:11 accepted"], ["3:30 accepted"], ["4:18 accepted", "local $"]])
		const uses = [
			`const w = { $, f() { (this as any).$.a = type("number") } }
w.f()`,
			`const f = (m: any) => { m.a = type("number") }
;[$].map(f)`,
			`;({ ...{ $, get g() { (this as any).$.a = type("number"); return 1 } } })`,
			`;[$.sub].forEach((m: any) => { m.a = type("number") })`,
			`Object.values($).forEach((m: any) => { m.a = type("number") })`,
			`;($.a as any).constructor.constructor("m", "t", "m.a = t")($, type("number"))`,
			`;($.a.meta as any).f($)`,
			`$.a($)`
		]
		attest(
			uses.map(use =>
				inputsOf(`import { type, scope } from "arktype"
const $: any = type.module({ a: "string", sub: type.module({ a: "string" }) })
${use}
export const T = type({ x: $.a, y: $.sub.a })`).pop()
			)
		).snap([
			["5:18 accepted", "local $.a", "local $.sub.a"],
			["5:18 accepted", "local $.a", "local $.sub.a"],
			["4:18 accepted", "local $.a", "local $.sub.a"],
			["4:18 accepted", "local $.a", "local $.sub.a"],
			["4:18 accepted", "local $.a", "local $.sub.a"],
			["4:18 accepted", "local $.a", "local $.sub.a"],
			["4:18 accepted", "local $.a", "local $.sub.a"],
			["4:18 accepted", "local $.a", "local $.sub.a"]
		])
		attest(
			inputsOf(`import { type, scope } from "arktype"
const $ = scope({ a: "string" }).export()
const A = $.a.array().describe("strings")
const B = ($.a as any).array()
export const T = type({ x: $.a })`)
		).snap([
			["2:11 accepted"],
			["3:11 accepted"],
			["4:11 accepted"],
			["5:18 accepted"]
		])
	})

	it("modules read through another binding", () => {
		attest(
			inputsOf(`import { type } from "arktype"
const $ = type.module({ sub: type.module({ a: "string" }) })
const m = $.sub
;($.sub as any).a = type("number")
export const T = type({ x: m.a })`).pop()
		).snap(["5:18 accepted", "local $.sub"])
		attest(
			inputsOf(
				`import { type } from "arktype"
import { $ } from "./b.ts"
const m = $
export const T = type({ x: m.a })`,
				{
					"/b.ts": `import { type } from "arktype"
export const $ = type.module({ a: "string" })
;($ as any).a = type("number")`
				}
			).pop()
		).snap(["4:18 accepted", "import $"])
	})

	it("scopes", () => {
		attest(
			inputsOf(`import { type, scope } from "arktype"
const s = scope({ a: "string" })
s.export()
;(s as any).resolutions.a = type("number").internal
export const T = s.type("a")`).pop()
		).snap(["5:18 accepted", "local s"])
		attest(
			inputsOf(`import { scope } from "arktype"
const s = scope({ a: "string" })
export const R = s.type.Record("string", "a")
export const T = s.type("a")`)
		).snap([["2:11 accepted"], ["3:18 accepted"], ["4:18 accepted"]])
	})

	it("dates and regexes", () => {
		attest(
			inputsOf(`import { type } from "arktype"
const d = new Date(0)
d.setTime(1000)
const r = /^a$/
;(r as any).compile("^b$")
export const A = type("Date").atOrAfter(d)
export const B = type("string").matching(r)`)
		).snap([
			["6:18 accepted", "local d"],
			["7:18 accepted", "local r"]
		])
	})
})
