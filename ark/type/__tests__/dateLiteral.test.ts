import { attest, contextualize } from "@ark/attest"
import { writeInvalidDateMessage } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("base", () => {
		const T = type("d'2000-05-05'")
		attest<Date>(T.infer)
		attest(T.allows(new Date("2000-05-05"))).equals(true)
		attest(T.allows(new Date("2000-06-05"))).equals(false)
		attest(T.allows(new Date("2000-05-05T09:00:00.000Z"))).equals(false)
	})

	it("with punctuation", () => {
		const ISO = type("d'2000-05-05T04:00:00.000Z'")
		attest<Date>(ISO.infer)
		attest(ISO.allows(new Date("2000/05/05"))).equals(true)
		attest(ISO.allows(new Date("2000/07/05"))).equals(false)
	})

	it("a miss prints the Date", () => {
		attest(type("d'2020-01-01'")(new Date("2020-01-02")).toString()).snap(
			"must be 2020-01-01 (was January 2, 2020)"
		)
	})

	it("rejects an invalid Date", () => {
		const T = type({ a: "d'1970-01-01T00:00:02.000Z'" })
		attest(T({ a: new Date(Number.NaN) }).toString()).snap(
			"a must be 1970-01-01T00:00:02.000Z (was an object)"
		)
		attest(type("2000 <= Date <= 2000").allows(new Date(Number.NaN))).equals(
			false
		)
	})

	it("rejects an object only inheriting Date.prototype", () => {
		const impostor = Object.create(Date.prototype)
		attest(type("Date")(impostor).toString()).snap(
			"must be a Date (was an object)"
		)
		attest(type("Date > d'2020-01-01'").allows(impostor)).equals(false)
		attest(type("d'2020-01-01'")(impostor).toString()).snap(
			"must be 2020-01-01 (was an object)"
		)
		attest(
			type.schema({ proto: Date, dateAllowsInvalid: true }).allows(impostor)
		).equals(false)
	})

	it("offset", () => {
		attest(type("d'2000-05-05T00:00+05:00'").expression).snap(
			"d'2000-05-04T19:00:00.000Z'"
		)
	})

	it("year", () => {
		attest(type("d'2000'").expression).snap("d'2000-01-01T00:00:00.000Z'")
	})

	it("epoch", () => {
		const now = new Date()
		const T = type(`d'${now.valueOf()}'`)
		attest(T.allows(now)).equals(true)
		attest(T.allows(new Date(now.valueOf() + 1))).equals(false)
		attest(type("d'12'").expression).snap("d'1970-01-01T00:00:00.012Z'")
	})

	it("epoch left bound", () => {
		const T = type("d'0' < Date < d'10'")
		attest(T.json).snap({
			proto: "Date",
			before: "1970-01-01T00:00:00.009Z",
			after: "1970-01-01T00:00:00.001Z"
		})
	})

	it("invalid date", () => {
		attest(() => type("d'tuesday'")).throws(writeInvalidDateMessage("tuesday"))
	})

	it("rejects local time", () => {
		attest(() => type("d'2000-05-05T00:00'")).throws(
			writeInvalidDateMessage("2000-05-05T00:00")
		)
		attest(() => type("d'05/05/2000'")).throws(
			writeInvalidDateMessage("05/05/2000")
		)
		attest(() => type("d'2000-05-05 00:00Z'")).throws(
			writeInvalidDateMessage("2000-05-05 00:00Z")
		)
	})

	it("rejects impossible days", () => {
		attest(() => type("d'2001-02-29'")).throws(
			writeInvalidDateMessage("2001-02-29")
		)
		attest(type("d'2000-02-29'").expression).snap("d'2000-02-29T00:00:00.000Z'")
	})

	it("prints ISO instants", () => {
		const T = type("d'2000-01-01' <= Date <= d'2000-01-01T12:00-05:00'")
		attest(T.expression).snap(
			"d'2000-01-01T00:00:00.000Z' <= Date <= d'2000-01-01T17:00:00.000Z'"
		)
		attest(T.description).snap(
			"a Date and January 1, 2000, 5:00 PM UTC or earlier and January 1, 2000 or later"
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
