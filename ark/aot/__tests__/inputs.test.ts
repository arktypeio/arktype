import { attest, contextualize } from "@ark/attest"
import { inputsOf } from "./utils.ts"

contextualize(() => {
	it("objects read through a binding", () => {
		attest(
			inputsOf(`import { type } from "arktype"
const o = { a: "string", b: { c: "number" }, l: ["string"] }
export const A = type(o.a)
export const B = type(o.b)
export const C = type({ ...o.b, l: o.l })`)
		).snap([
			["3:18 accepted", "local o.a"],
			["4:18 accepted", "local o.b"],
			["5:18 accepted", "local o.b", "local o.l"]
		])
	})

	it("writes through what the build does not follow", () => {
		const uses = [
			`;\`\${{ o, toString() { (this as any).o.a = "number"; return "" } }}\``,
			`function f(x: unknown) { return (arguments[0].a = "number") }
f(o)`,
			`;[o].map((x: any) => (x.a = "number"))`,
			`const d: any = type.define(o)
d.a = "number"`,
			`const S = type("string")
;(S as any).and = (d: any) => ((d.a = "number"), S)
S.and(o)`
		]
		attest(
			uses.map(use =>
				inputsOf(`import { type } from "arktype"
const o: any = { a: "string" }
${use}
export const T = type(o.a)`).pop()
			)
		).snap([
			[
				"4:18 rejected",
				"`o` reaches code the build doesn't follow at /main.ts:3:2, so its value at the site is not known"
			],
			[
				"5:18 rejected",
				"`o` reaches code the build doesn't follow at /main.ts:4:1, so its value at the site is not known"
			],
			[
				"4:18 rejected",
				"`o` is written at /main.ts:3:23, so its value at the site is not known"
			],
			[
				"5:18 rejected",
				"`o` is written at /main.ts:4:1, so its value at the site is not known"
			],
			[
				"6:18 rejected",
				"`o` reaches code the build doesn't follow at /main.ts:5:1, so its value at the site is not known"
			]
		])
	})

	it("generics", () => {
		attest(
			[
				`const o = { a: "t" }
const G = type("<t>", o)
export const T = G("string")`,
				`const o = { v: "t" }
const $ = type.module({ "box<t>": o })
const G = $.box
export const T = G("string")`
			].map(source =>
				inputsOf(`import { type } from "arktype"
${source}`).pop()
			)
		).snap([
			["4:18 accepted", "local o"],
			["5:18 accepted", "local o"]
		])
		attest(
			["export const o", "const o"].map(
				declaration =>
					inputsOf(
						`import { G } from "./g.ts"
export const T = G("string")`,
						{
							"/g.ts": `import { type } from "arktype"
${declaration} = { a: "t" }
export const G = type("<t>", o)`
						}
					)[0]
			)
		).snap([
			["2:18 accepted", "import o", "import G"],
			[
				"2:18 rejected",
				"the site reads `o` (/g.ts:2:7), which its module cannot import, so the site cannot compare it at creation"
			]
		])
	})

	it("scopes", () => {
		attest(
			inputsOf(`import { scope } from "arktype"
const o = { name: "string" }
const s = scope({ user: o })
export const T = s.type("user")`).pop()
		).snap(["4:18 accepted", "local o"])
		attest(
			inputsOf(`import { scope } from "arktype"
const s = scope({ a: "string" })
export const R = s.type.Record("string", "a")
export const T = s.type("a")`)
		).snap([["2:11 accepted"], ["3:18 accepted"], ["4:18 accepted"]])
	})

	it("arktype values", () => {
		attest(
			inputsOf(`import { type, scope } from "arktype"
const $ = scope({ a: "string", sub: type.module({ b: "number" }) }).export()
const A = type("string")
const G = type("<t>", { v: "t" })
export const T = type({ x: $.a, y: $.sub.b, z: A.array(), w: G("string") })`).pop()
		).snap(["5:18 accepted"])
	})

	it("imports", () => {
		attest(
			inputsOf(
				`import { type } from "arktype"
import { $, A, o } from "./b.ts"
const m = $
export const T = type({ x: m.a, y: A, z: o.a })`,
				{
					"/b.ts": `import { type } from "arktype"
export const $ = type.module({ a: "string" })
export const A = type("number")
export const o = { a: "boolean" }`
				}
			)
		).snap([["4:18 accepted", "import $", "import A", "import o.a"]])
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

	it("an introspected import is not an input", () => {
		const source = `import { User } from "./user.ts"
export const json = User.json`
		const user = `import { type } from "arktype"
export const User = type({ name: "string" })`
		attest(inputsOf(source, { "/user.ts": user })).snap([["2:21 accepted"]])
		// unless a bundler dropping its module would drop more than declarations
		attest(
			inputsOf(source, {
				"/user.ts": `${user}\nconsole.log(User.expression)`
			})
		).snap([["2:21 accepted", "import User"]])
	})
})
