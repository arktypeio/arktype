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
;(A as any).constructor.constructor("o", "o.a = 'number'")(o)`
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
			["5:18 accepted", "local o.a"]
		])
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
