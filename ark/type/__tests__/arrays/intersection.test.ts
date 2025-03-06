import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("shallow array intersection", () => {
		const t = type("string[]&'foo'[]")
		const expected = type("'foo'[]")
		attest(t.json).equals(expected.json)
	})

	it("deep array intersection", () => {
		const t = type([{ a: "string" }, "[]"]).and([{ b: "number" }, "[]"])
		const expected = type([{ a: "string", b: "number" }, "[]"])
		attest(t.json).equals(expected.json)
	})

	it("tuple intersection", () => {
		const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
		const expected = type([{ a: "string", b: "boolean" }])
		attest<typeof expected>(t)
		attest(t.json).equals(expected.json)
	})

	it("tuple and array", () => {
		const tupleAndArray = type([
			[{ a: "string" }],
			"&",
			[{ b: "boolean" }, "[]"]
		])
		const arrayAndTuple = type([
			[{ b: "boolean" }, "[]"],
			"&",
			[{ a: "string" }]
		])

		const expected = type([{ a: "string", b: "boolean" }])
		attest<typeof expected>(tupleAndArray)

		attest<typeof expected>(arrayAndTuple)

		attest(tupleAndArray.json).equals(expected.json)
		attest(arrayAndTuple.json).equals(expected.json)
	})

	it("variadic and tuple", () => {
		const b = type([{ b: "boolean" }, "[]"])
		const t = type([{ a: "string" }, "...", b]).and([
			{ c: "number" },
			{ d: "Date" }
		])
		const expected = type([
			{ a: "string", c: "number" },
			{ b: "boolean", d: "Date" }
		])
		attest(t.json).equals(expected.json)
	})

	it("variadic and array", () => {
		const b = type({ b: "boolean" }, "[]")
		const t = type([{ a: "string" }, "...", b]).and([{ c: "number" }, "[]"])
		const expected = type([
			{ a: "string", c: "number" },
			"...",
			[{ b: "boolean", c: "number" }, "[]"]
		])
		attest<typeof expected.infer>(t.infer)
		attest(t.json).equals(expected.json)
	})

	// based on the equivalent type-level test from @ark/util
	it("kitchen sink", () => {
		const l = type([
			{ a: "0" },
			[{ b: "1" }, "?"],
			[{ c: "2" }, "?"],
			"...",
			[{ d: "3" }, "[]"]
		])
		const r = type([
			[{ e: "4" }, "?"],
			[{ f: "5" }, "?"],
			"...",
			[{ g: "6" }, "[]"]
		])
		const result = l.and(r)

		const expected = type([
			{ a: "0", e: "4" },
			[{ b: "1", f: "5" }, "?"],
			[{ c: "2", g: "6" }, "?"],
			"...",
			[{ d: "3", g: "6" }, "[]"]
		])

		attest(result.expression).snap(
			"[{ a: 0, e: 4 }, { b: 1, f: 5 }?, { c: 2, g: 6 }?, ...{ d: 3, g: 6 }[]]"
		)

		attest<typeof expected>(result)
		attest(result.expression).equals(expected.expression)
	})

	it("prefix and postfix", () => {
		const l = type(["...", [{ a: "0" }, "[]"], { b: "0" }, { c: "0" }])
		const r = type([{ x: "0" }, { y: "0" }, "...", [{ z: "0" }, "[]"]])

		const expected = type([
			{ a: "0", x: "0" },
			{ a: "0", y: "0" },
			"...",
			[{ a: "0", z: "0" }, "[]"],
			{ b: "0", z: "0" },
			{ c: "0", z: "0" }
		])
			.or([
				{ a: "0", x: "0" },
				{ b: "0", y: "0" },
				{ c: "0", z: "0" }
			])
			.or([
				{ b: "0", x: "0" },
				{ c: "0", y: "0" }
			])

		const lrResult = l.and(r)
		attest(lrResult.json).snap(expected.json)
		const rlResult = r.and(l)
		attest(rlResult.json).snap(expected.json)
	})

	it("reduces minLength", () => {
		const t = type(["number", "number", "...", "number[]", "number"])
		const expected = type("number[]>=3")
		attest(t.json).equals(expected.json)
	})

	it("array with props", () => {
		const t = type("Array").and({ name: "string" })

		attest(t.json).snap({
			required: [{ key: "name", value: "string" }],
			proto: "Array"
		})

		attest<
			unknown[] & {
				name: string
			}
		>(t.t)

		attest(t({ name: "foo" }).toString()).snap("must be an array (was object)")
		const arrayWithProps = Object.assign([], { name: "foo" })
		attest(t(arrayWithProps)).equals(arrayWithProps)
	})

	it("shallow array intersection", () => {
		const t = type("string[]&'foo'[]")
		const expected = type("'foo'[]")
		attest(t.json).equals(expected.json)
	})

	it("deep array intersection", () => {
		const t = type([{ a: "string" }, "[]"]).and([{ b: "number" }, "[]"])
		const expected = type([{ a: "string", b: "number" }, "[]"])
		attest(t.json).equals(expected.json)
	})

	it("tuple intersection", () => {
		const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
		const expected = type([{ a: "string", b: "boolean" }])
		attest<typeof expected>(t)
		attest(t.json).equals(expected.json)
	})

	it("tuple and array", () => {
		const tupleAndArray = type([
			[{ a: "string" }],
			"&",
			[{ b: "boolean" }, "[]"]
		])
		const arrayAndTuple = type([
			[{ b: "boolean" }, "[]"],
			"&",
			[{ a: "string" }]
		])

		const expected = type([{ a: "string", b: "boolean" }])
		attest<typeof expected>(tupleAndArray)

		attest<typeof expected>(arrayAndTuple)

		attest(tupleAndArray.json).equals(expected.json)
		attest(arrayAndTuple.json).equals(expected.json)
	})

	it("variadic and tuple", () => {
		const b = type([{ b: "boolean" }, "[]"])
		const t = type([{ a: "string" }, "...", b]).and([
			{ c: "number" },
			{ d: "Date" }
		])
		const expected = type([
			{ a: "string", c: "number" },
			{ b: "boolean", d: "Date" }
		])
		attest(t.json).equals(expected.json)
	})

	it("variadic and array", () => {
		const b = type({ b: "boolean" }, "[]")
		const t = type([{ a: "string" }, "...", b]).and([{ c: "number" }, "[]"])
		const expected = type([
			{ a: "string", c: "number" },
			"...",
			[{ b: "boolean", c: "number" }, "[]"]
		])
		attest<typeof expected.infer>(t.infer)
		attest(t.json).equals(expected.json)
	})

	// based on the equivalent type-level test from @ark/util
	it("kitchen sink", () => {
		const l = type([
			{ a: "0" },
			[{ b: "1" }, "?"],
			[{ c: "2" }, "?"],
			"...",
			[{ d: "3" }, "[]"]
		])
		const r = type([
			[{ e: "4" }, "?"],
			[{ f: "5" }, "?"],
			"...",
			[{ g: "6" }, "[]"]
		])
		const result = l.and(r)

		const expected = type([
			{ a: "0", e: "4" },
			[{ b: "1", f: "5" }, "?"],
			[{ c: "2", g: "6" }, "?"],
			"...",
			[{ d: "3", g: "6" }, "[]"]
		])

		attest(result.expression).snap(
			"[{ a: 0, e: 4 }, { b: 1, f: 5 }?, { c: 2, g: 6 }?, ...{ d: 3, g: 6 }[]]"
		)

		attest<typeof expected>(result)
		attest(result.expression).equals(expected.expression)
	})

	it("prefix and postfix", () => {
		const l = type(["...", [{ a: "0" }, "[]"], { b: "0" }, { c: "0" }])
		const r = type([{ x: "0" }, { y: "0" }, "...", [{ z: "0" }, "[]"]])

		const expected = type([
			{ a: "0", x: "0" },
			{ a: "0", y: "0" },
			"...",
			[{ a: "0", z: "0" }, "[]"],
			{ b: "0", z: "0" },
			{ c: "0", z: "0" }
		])
			.or([
				{ a: "0", x: "0" },
				{ b: "0", y: "0" },
				{ c: "0", z: "0" }
			])
			.or([
				{ b: "0", x: "0" },
				{ c: "0", y: "0" }
			])

		const lrResult = l.and(r)
		attest(lrResult.json).snap(expected.json)
		const rlResult = r.and(l)
		attest(rlResult.json).snap(expected.json)
	})
})
