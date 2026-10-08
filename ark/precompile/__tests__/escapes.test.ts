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
const d = o.b.map(s => s.length)
export const T = type(o.a)`)
		).snap([["7:18 accepted"]])
	})

	it("arguments of a function", () => {
		attest(
			inputsOf(`import { type } from "arktype"
const o = { a: "string" }
function f(x: unknown) { return (arguments[0].a = "number") }
f(o)
export const T = type(o.a)`)
		).snap([["5:18 accepted", "local o.a"]])
	})

	it("callbacks passed by name", () => {
		const uses = [
			`const f = (x: any) => (x.a = "number")
;[o].map(f)`,
			`function f(x: any) { x.a = "number" }
Array.from([o], f)`,
			`const g = (acc: any, x: any) => ((x.a = "number"), acc)
;[o].reduce(g, 0)`,
			`;[o].map(function () { arguments[0].a = "number" })`,
			`Array.from([0], function (this: any) { this.a = "number" }, o)`
		]
		attest(
			uses.map(
				use =>
					inputsOf(`import { type } from "arktype"
const o = { a: "string" }
${use}
export const T = type(o.a)`)[0]
			)
		).snap([
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["5:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"],
			["4:18 accepted", "local o.a"]
		])
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
