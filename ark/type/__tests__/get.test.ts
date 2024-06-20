import { attest, contextualize } from "@arktype/attest"
import {
	writeBadKeyAccessMessage,
	writeRawNumberIndexMessage
} from "@arktype/schema"
import { ark, type } from "arktype"

contextualize(() => {
	it("can get shallow roots by path", () => {
		const t = type({
			foo: "string",
			bar: "number|bigint"
		})

		attest(t.get("bar").expression).snap("bigint | number")
	})

	it("can get deep roots by path", () => {
		const t = type({
			foo: {
				baz: "1"
			},
			bar: {
				quux: "2"
			}
		})

		attest(t.get("foo", "baz").expression).snap("1")

		attest(t.get("bar", "quux").expression).snap("2")
	})

	it("can merge across a deep union", () => {
		const t = type(
			{
				foo: {
					bar: "0"
				}
			},
			"|",
			{
				foo: {
					bar: "1"
				}
			}
		)

		attest(t.get("foo", "bar").expression).snap("0 | 1")
	})

	it("can get index keys", () => {
		const t = type({
			"[/^f/]": "0"
		})

		attest(t.get("foo").expression).snap("undefined | 0")
		attest(() => t.get("bar")).throwsAndHasTypeError(
			writeBadKeyAccessMessage("bar", t.expression)
		)
	})

	it("named and multiple indices", () => {
		const t = type({
			"[/^f/]": {
				a: "1"
			},
			"[/f$/]": { b: "1" },
			foof: { c: "1" }
		})

		attest(t.get("foo").expression).snap("{ a: 1 } | undefined")
		attest(t.get("oof").expression).snap("{ b: 1 } | undefined")
		attest(t.get("fof").expression).snap("{ a: 1, b: 1 } | undefined")
		attest(t.get("foof").expression).snap("{ a: 1, b: 1, c: 1 }")
		attest(() => t.get("goog").expression).throwsAndHasTypeError(
			writeBadKeyAccessMessage("goog", t.expression)
		)
	})

	it("optional key adds undefined", () => {
		const t = type({
			"foo?": "null"
		})

		attest(t.get("foo").expression).snap("undefined | null")
	})

	it("non-fixed array", () => {
		const t = type("string[]")

		attest(t.get(0).expression).snap("string | undefined")
		attest(() => t.get(-1)).throws(writeBadKeyAccessMessage("-1", t.expression))
		attest(() => t.get(5.5)).throws(
			writeBadKeyAccessMessage("5.5", t.expression)
		)

		attest(t.get(ark.nonNegativeIntegerString).expression).snap(
			"string | undefined"
		)
	})

	it("number access on non-variadic", () => {
		const t = type({ foo: "number" }).array()

		attest(() => t.get(ark.number)).throws(
			writeRawNumberIndexMessage("number", t.expression)
		)
		// number subtype
		attest(() => t.get(ark.integer)).throws(
			writeRawNumberIndexMessage("number % 1", t.expression)
		)
	})

	it("tuple", () => {
		const t = type(["1", "2", "?"])

		// fixed
		attest(t.get(0).expression).snap("1")
		attest(t.get(1).expression).snap("undefined | 2")

		// out of bounds
		attest(() => t.get(2)).throws(writeBadKeyAccessMessage("2", t.expression))
	})

	it("variadic tuple", () => {
		const t = type(["1", "2", "...", "3[]", "4", "5"])

		// fixed
		attest(t.get(0).expression).snap("1")
		attest(t.get(1).expression).snap("2")

		// variadic
		// based on length, we could narrow this to remove undefined in the future
		attest(t.get(2).expression).snap("undefined | 3 | 4 | 5")
		attest(t.get(100).expression).snap("undefined | 3 | 4 | 5")
	})
})
