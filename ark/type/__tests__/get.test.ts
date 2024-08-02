import { attest, contextualize } from "@ark/attest"
import { writeInvalidKeysMessage, writeNumberIndexMessage } from "@ark/schema"
import { ark, type } from "arktype"
import type { Matching, constrain, string } from "../ast.js"

contextualize(() => {
	it("can get shallow roots by path", () => {
		const t = type({
			foo: "string",
			bar: "number|bigint"
		})

		const a = t.get("bar")
		attest<number | bigint>(a.infer)
		attest(a.expression).snap("bigint | number")
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

		const a = t.get("foo", "baz")
		attest<1>(a.t)
		attest(a.expression).snap("1")

		const b = t.get("bar", "quux")
		attest<2>(b.t)
		attest(b.expression).snap("2")
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

		const a = t.get("foo" as string & string.matching<"^f">)
		attest<0>(a.t)
		attest(a.expression).snap("undefined | 0")

		// @ts-expect-error
		attest(() => t.get("bar")).throws(
			writeInvalidKeysMessage(t.expression, ["bar"])
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

		const d = t.get(
			"foof" as constrain<"foof", Matching<"^f"> & Matching<"f$">>
		)
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
		attest(() => t.get("goog").expression).throws(
			writeInvalidKeysMessage(t.expression, ["goog"])
		)
	})

	it("optional key adds undefined", () => {
		const t = type({
			"foo?": "null"
		})

		const a = t.get("foo")
		attest<null | undefined>(a.t)
		attest(a.expression).snap("undefined | null")
	})

	it("non-fixed array", () => {
		const t = type("string[]")

		const a = t.get("0")
		attest<string>(a.infer)
		attest(a.expression).snap("string | undefined")

		// @ts-expect-error
		attest(() => t.get("-1")).throws(
			writeInvalidKeysMessage(t.expression, ["-1"])
		)
		// @ts-expect-error
		attest(() => t.get("5.5")).throws(
			writeInvalidKeysMessage(t.expression, ["5.5"])
		)

		attest(t.get(ark.nonNegativeIntegerString).expression).snap(
			"string | undefined"
		)
	})

	it("number access on non-variadic", () => {
		const t = type({ foo: "number" }).array()

		// @ts-expect-error
		attest(() => t.get(ark.number)).throws(
			writeNumberIndexMessage("number", t.expression)
		)

		// number subtype
		// @ts-expect-error
		attest(() => t.get(ark.integer)).throws(
			writeNumberIndexMessage("number % 1", t.expression)
		)
	})

	it("tuple", () => {
		const t = type(["1", "2", "?"])

		// fixed
		const a = t.get(0)
		attest<1>(a.infer)
		attest(a.expression).snap("1")
		const b = t.get(1)
		attest<2 | undefined>(b.infer)
		attest(b.expression).snap("undefined | 2")

		// out of bounds
		// @ts-expect-error
		attest(() => t.get(2)).throws(writeInvalidKeysMessage(t.expression, ["2"]))
	})

	it("variadic tuple", () => {
		const t = type(["1", "2", "...", "3[]", "4", "5"])

		// fixed
		const a = t.get(0)
		attest<1>(a.t)
		attest(a.expression).snap("1")

		const b = t.get(1)
		attest<2>(b.t)
		attest(b.expression).snap("2")

		// variadic
		// based on length, we could narrow this to remove undefined in the future
		attest(t.get("2").expression).snap("undefined | 3 | 4 | 5")
		attest(t.get("100").expression).snap("undefined | 3 | 4 | 5")
	})

	it("deep", () => {
		const t = type({
			foo: {
				"[symbol]": {
					bar: "1",
					"baz?": "2"
				}
			}
		})

		const bar = t.get("foo", ark.symbol, "bar")
		attest<1>(bar.t)
		attest(bar.expression).snap("undefined | 1")

		const baz = t.get("foo", ark.symbol, "baz")
		attest<2 | undefined>(baz.t)
		attest(baz.expression).snap("undefined | 2")

		// @ts-expect-error
		attest(() => t.get("foo", ark.symbol, "")).completions({
			"": ["bar", "baz"]
		})
	})
})
