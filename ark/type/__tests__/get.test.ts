import { attest, contextualize } from "@arktype/attest"
import {
	writeBadKeyAccessMessage,
	writeRawNumberIndexMessage,
	type Matching,
	type of,
	type string
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
		const base = type(
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

		const t = base.get("foo", "bar")

		attest<0 | 1>(t.infer)
		attest(t.expression).snap("0 | 1")
	})

	it("can get index keys", () => {
		const t = type({
			"[/^f/]": "0",
			named: "1"
		})

		attest(t.get("foo" as string & string.matching<"^f">).expression).snap(
			"undefined | 0"
		)

		// @ts-expect-error
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

		const a = t.get("foo" as string.matching<"^f">)

		attest<{ a: 1 }>(a.infer)
		attest(a.expression).snap("{ a: 1 } | undefined")

		const b = t.get("oof" as string.matching<"f$">)
		attest<{ b: 1 }>(b.infer)
		attest(b.expression).snap("{ b: 1 } | undefined")

		const c = t.get("fof" as string.matching<"^f"> & string.matching<"f$">)
		attest<{
			a: 1
			b: 1
		}>(c.infer)
		attest(c.expression).snap("{ a: 1, b: 1 } | undefined")

		const d = t.get("foof" as of<"foof", Matching<"^f"> & Matching<"f$">>)
		// should include { c: 1 } as well but it seems TS can't infer it for now
		attest<
			{
				a: 1
			} & {
				b: 1
			}
		>(d.infer)
		attest(d.expression).snap("{ a: 1, b: 1, c: 1 }")

		// @ts-expect-error
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

		const a = t.get(0)
		attest<string>(a.infer)
		attest(a.expression).snap("string | undefined")
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

		// @ts-expect-error
		attest(() => t.get(ark.number)).throws(
			writeRawNumberIndexMessage("number", t.expression)
		)

		// number subtype
		// @ts-expect-error
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
