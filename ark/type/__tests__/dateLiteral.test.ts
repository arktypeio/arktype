import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeInvalidDateMessage } from "arktype/internal/parser/shift/operand/date.ts"

contextualize(() => {
	it("base", () => {
		const T = type("d'2000/05/05'")
		attest<Date>(T.infer)
		attest(T.allows(new Date("2000/05/05"))).equals(true)
		attest(T.allows(new Date("2000/06/05"))).equals(false)
		attest(T.allows(new Date("2000-05-05T09:00:00.000Z"))).equals(false)
	})

	it("with punctuation", () => {
		const ISO = type("d'2000-05-05T04:00:00.000Z'")
		attest<Date>(ISO.infer)
		attest(ISO.allows(new Date("2000/05/05"))).equals(true)
		attest(ISO.allows(new Date("2000/07/05"))).equals(false)
	})

	it("allows spaces", () => {
		const T = type("d' 2021  /  05  /  01  '")
		attest(T.allows(new Date("2021/05/01"))).equals(true)
	})

	it("epoch", () => {
		const now = new Date()
		const T = type(`d'${now.valueOf()}'`)
		attest(T.allows(now)).equals(true)
		attest(T.allows(new Date(now.valueOf() + 1))).equals(false)
	})

	it("invalid date", () => {
		attest(() => type("d'tuesday'")).throws(writeInvalidDateMessage("tuesday"))
	})

	it("prints ISO instants", () => {
		const T = type("d'2000-01-01' <= Date <= d'2000-01-01T12:00-05:00'")
		attest(T.expression).snap(
			"Date <= d'2000-01-01T17:00:00.000Z' & >= d'2000-01-01T00:00:00.000Z'"
		)
		attest(T.description).snap(
			"a Date and January 1, 2000, 5:00 PM UTC or earlier and 2000 or later"
		)
		attest(T(new Date("2000-01-01T18:00Z")).toString()).snap(
			"must be January 1, 2000, 5:00 PM UTC or earlier (was January 1, 2000, 6:00 PM UTC)"
		)
		attest(() => type("d'2001-01-01' <= Date <= d'2000-01-01'")).throws(
			"Intersection of <= d'2000-01-01T00:00:00.000Z' and >= d'2001-01-01T00:00:00.000Z' results in an unsatisfiable type"
		)
	})

	it("morphable", () => {
		const T = type(["Date", "=>", d => d.toISOString()])
		attest(T.from(new Date(2000, 1))).snap("2000-02-01T05:00:00.000Z")
	})
})
