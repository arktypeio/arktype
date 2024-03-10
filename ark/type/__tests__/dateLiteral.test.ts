import { attest } from "@arktype/attest"
import { type } from "arktype"
import { writeInvalidDateMessage } from "../parser/string/shift/operand/date.js"

describe("date literal", () => {
	it("base", () => {
		const t = type("d'2000/05/05'")
		attest<Date>(t.infer)
		attest(t.allows(new Date("2000/05/05"))).equals(true)
		attest(t.allows(new Date("2000/06/05"))).equals(false)
		attest(t.allows(new Date("2000-05-05T09:00:00.000Z"))).equals(false)
	})
	it("with punctuation", () => {
		const ISO = type("d'2000-05-05T04:00:00.000Z'")
		attest<Date>(ISO.infer)
		attest(ISO.allows(new Date("2000/05/05"))).equals(true)
		attest(ISO.allows(new Date("2000/07/05"))).equals(false)
	})
	it("allows spaces", () => {
		const t = type("d' 2021  /  05  /  01  '")
		attest(t.allows(new Date("2021/05/01"))).equals(true)
	})
	it("epoch", () => {
		const now = new Date()
		const t = type(`d'${now.valueOf()}'`)
		attest(t.allows(now)).equals(true)
		attest(t.allows(new Date(now.valueOf() + 1)))
	})
	it("invalid date", () => {
		attest(() => type("d'tuesday'")).throws(writeInvalidDateMessage("tuesday"))
	})
})
