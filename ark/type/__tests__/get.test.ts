import { attest, contextualize } from "@ark/attest"
import { writeInvalidKeysMessage, writeNumberIndexMessage } from "@ark/schema"
import { keywords, type } from "arktype"

contextualize(() => {
	it("can get shallow roots by path", () => {
		const T = type({
			foo: "string",
			bar: "number|bigint"
		})

		const a = T.get("bar")
		attest<number | bigint>(a.infer)
		attest(a.expression).snap("bigint | number")
	})

	it("can get deep roots by path", () => {
		const T = type({
			foo: {
				baz: "1"
			},
			bar: {
				quux: "2"
			}
		})

		const a = T.get("foo", "baz")
		attest<1>(a.t)
		attest(a.expression).snap("1")

		const b = T.get("bar", "quux")
		attest<2>(b.t)
		attest(b.expression).snap("2")
	})

	it("can merge across a deep union", () => {
		const Base = type(
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

		const T = Base.get("foo", "bar")

		attest<0 | 1>(T.infer)
		attest(T.expression).snap("0 | 1")
	})

	it("can get index keys", () => {
		const T = type({
			"[/^f/]": "0",
			named: "1"
		})

		const a = T.get("foo")
		attest<0>(a.t)
		attest(a.expression).snap("undefined | 0")

		attest(() =>
			// @ts-expect-error
			T.get("bar")
		).throws(writeInvalidKeysMessage(T.expression, ["bar"]))
	})

	it("named and multiple indices", () => {
		const T = type({
			"[/^f/]": {
				a: "1"
			},
			"[/f$/]": { b: "1" },
			foof: { c: "1" }
		})

		const a = T.get("foo")

		attest<{ a: 1 }>(a.infer)
		attest(a.expression).snap("{ a: 1 } | undefined")

		const b = T.get("oof")
		attest<{ b: 1 }>(b.infer)
		attest(b.expression).snap("{ b: 1 } | undefined")

		const c = T.get("fof")
		attest<{ a: 1 } & { b: 1 }>(c.infer)
		attest(c.expression).snap("{ a: 1, b: 1 } | undefined")

		const d = T.get("foof")

		attest<{ c: 1 }>(d.infer)
		attest(d.expression).snap("{ a: 1, b: 1, c: 1 }")

		attest(
			() =>
				// @ts-expect-error
				T.get("goog").expression
		).throws(writeInvalidKeysMessage(T.expression, ["goog"]))
	})

	it("optional key adds undefined", () => {
		const T = type({
			"foo?": "null"
		})

		const a = T.get("foo")
		attest<null | undefined>(a.t)
		attest(a.expression).snap("undefined | null")
	})

	it("non-fixed array", () => {
		const T = type("string[]")

		const a = T.get("0")
		attest<string>(a.infer)
		attest(a.expression).snap("string | undefined")

		// @ts-expect-error
		attest(() => T.get("-1")).throws(
			writeInvalidKeysMessage(T.expression, ["-1"])
		)
		// @ts-expect-error
		attest(() => T.get("5.5")).throws(
			writeInvalidKeysMessage(T.expression, ["5.5"])
		)

		attest(T.get(type.arrayIndex).expression).snap("string | undefined")
	})

	it("array specific-index access access on non-tuple", () => {
		const T = type({ foo: "number" }).array()

		attest(T.get(0).expression).snap("{ foo: number } | undefined")
	})

	// https://github.com/arktypeio/arktype/issues/1261
	it("nested index access on non-tuple", () => {
		const Simple = type({
			id: "number",
			array: type({
				name: "string",
				age: "number"
			}).array()
		})

		const Arr = Simple.get("array")
		const InnerArr = Arr.get(0)

		attest(InnerArr.expression).snap(
			"{ age: number, name: string } | undefined"
		)
		InnerArr.assert({ name: "Rico", age: 25 })
	})

	it("number access on non-tuple", () => {
		const T = type({ foo: "number" }).array()

		// @ts-expect-error
		attest(() => T.get(type.number)).throws(
			writeNumberIndexMessage("number", T.expression)
		)

		// number subtype
		// @ts-expect-error
		attest(() => T.get(keywords.number.integer)).throws(
			writeNumberIndexMessage("number % 1", T.expression)
		)
	})

	it("tuple", () => {
		const T = type(["1", "2?"])

		// fixed
		const a = T.get(0)
		attest<1>(a.infer)
		attest(a.expression).snap("1")
		const b = T.get(1)
		attest<2 | undefined>(b.infer)
		attest(b.expression).snap("undefined | 2")

		// out of bounds
		// @ts-expect-error
		attest(() => T.get(2)).throws(writeInvalidKeysMessage(T.expression, ["2"]))
	})

	it("variadic tuple", () => {
		const T = type(["1", "2", "...", "3[]", "4", "5"])

		// fixed
		const a = T.get(0)
		attest<1>(a.t)
		attest(a.expression).snap("1")

		const b = T.get(1)
		attest<2>(b.t)
		attest(b.expression).snap("2")

		// variadic
		// based on length, we could narrow this to remove undefined in the future
		attest(T.get("2").expression).snap("undefined | 3 | 4 | 5")
		attest(T.get("100").expression).snap("undefined | 3 | 4 | 5")
	})

	it("deep", () => {
		const T = type({
			foo: {
				"[symbol]": {
					bar: "1",
					"baz?": "2"
				}
			}
		})

		const bar = T.get("foo", keywords.symbol, "bar")
		attest<1>(bar.t)
		attest(bar.expression).snap("undefined | 1")

		const baz = T.get("foo", keywords.symbol, "baz")
		attest<2 | undefined>(baz.t)
		attest(baz.expression).snap("undefined | 2")

		// @ts-expect-error
		attest(() => T.get("foo", keywords.symbol, "")).completions({
			"": ["bar", "baz"]
		})
	})
})
