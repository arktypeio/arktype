import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("shallow array intersection", () => {
		const T = type("string[]&'foo'[]")
		const Expected = type("'foo'[]")
		attest(T.json).equals(Expected.json)
	})

	it("deep array intersection", () => {
		const T = type([{ a: "string" }, "[]"]).and([{ b: "number" }, "[]"])
		const Expected = type([{ a: "string", b: "number" }, "[]"])
		attest(T.json).equals(Expected.json)
	})

	it("tuple intersection", () => {
		const T = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
		const Expected = type([{ a: "string", b: "boolean" }])
		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("tuple and array", () => {
		const TupleAndArray = type([
			[{ a: "string" }],
			"&",
			[{ b: "boolean" }, "[]"]
		])
		const ArrayAndTuple = type([
			[{ b: "boolean" }, "[]"],
			"&",
			[{ a: "string" }]
		])

		const Expected = type([{ a: "string", b: "boolean" }])
		attest<typeof Expected>(TupleAndArray)

		attest<typeof Expected>(ArrayAndTuple)

		attest(TupleAndArray.json).equals(Expected.json)
		attest(ArrayAndTuple.json).equals(Expected.json)
	})

	it("variadic and tuple", () => {
		const B = type([{ b: "boolean" }, "[]"])
		const T = type([{ a: "string" }, "...", B]).and([
			{ c: "number" },
			{ d: "Date" }
		])
		const Expected = type([
			{ a: "string", c: "number" },
			{ b: "boolean", d: "Date" }
		])
		attest(T.json).equals(Expected.json)
	})

	it("variadic and array", () => {
		const B = type({ b: "boolean" }, "[]")
		const T = type([{ a: "string" }, "...", B]).and([{ c: "number" }, "[]"])
		const Expected = type([
			{ a: "string", c: "number" },
			"...",
			[{ b: "boolean", c: "number" }, "[]"]
		])
		attest<typeof Expected.infer>(T.infer)
		attest(T.json).equals(Expected.json)
	})

	// based on the equivalent type-level test from @ark/util
	it("kitchen sink", () => {
		const L = type([
			{ a: "0" },
			[{ b: "1" }, "?"],
			[{ c: "2" }, "?"],
			"...",
			[{ d: "3" }, "[]"]
		])
		const R = type([
			[{ e: "4" }, "?"],
			[{ f: "5" }, "?"],
			"...",
			[{ g: "6" }, "[]"]
		])
		const T = L.and(R)

		const Expected = type([
			{ a: "0", e: "4" },
			[{ b: "1", f: "5" }, "?"],
			[{ c: "2", g: "6" }, "?"],
			"...",
			[{ d: "3", g: "6" }, "[]"]
		])

		attest(T.expression).snap(
			"[{ a: 0, e: 4 }, { b: 1, f: 5 }?, { c: 2, g: 6 }?, ...{ d: 3, g: 6 }[]]"
		)

		attest<typeof Expected>(T)
		attest(T.expression).equals(Expected.expression)
	})

	it("prefix and postfix", () => {
		const L = type(["...", [{ a: "0" }, "[]"], { b: "0" }, { c: "0" }])
		const R = type([{ x: "0" }, { y: "0" }, "...", [{ z: "0" }, "[]"]])

		const Expected = type([
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

		const lrResult = L.and(R)
		attest(lrResult.json).snap(Expected.json)
		const rlResult = R.and(L)
		attest(rlResult.json).snap(Expected.json)
	})

	it("reduces minLength", () => {
		const T = type(["number", "number", "...", "number[]", "number"])
		const Expected = type("number[]>=3")
		attest(T.json).equals(Expected.json)
	})

	it("array with props", () => {
		const T = type("Array").and({ name: "string" })

		attest(T.json).snap({
			required: [{ key: "name", value: "string" }],
			proto: "Array"
		})

		attest<
			unknown[] & {
				name: string
			}
		>(T.t)

		attest(T({ name: "foo" }).toString()).snap("must be an array (was object)")
		const arrayWithProps = Object.assign([], { name: "foo" })
		attest(T(arrayWithProps)).equals(arrayWithProps)
	})

	it("shallow array intersection", () => {
		const T = type("string[]&'foo'[]")
		const Expected = type("'foo'[]")
		attest(T.json).equals(Expected.json)
	})

	it("deep array intersection", () => {
		const T = type([{ a: "string" }, "[]"]).and([{ b: "number" }, "[]"])
		const Expected = type([{ a: "string", b: "number" }, "[]"])
		attest(T.json).equals(Expected.json)
	})

	it("tuple intersection", () => {
		const T = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
		const Expected = type([{ a: "string", b: "boolean" }])
		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("tuple and array", () => {
		const TupleAndArray = type([
			[{ a: "string" }],
			"&",
			[{ b: "boolean" }, "[]"]
		])
		const ArrayAndTuple = type([
			[{ b: "boolean" }, "[]"],
			"&",
			[{ a: "string" }]
		])

		const Expected = type([{ a: "string", b: "boolean" }])
		attest<typeof Expected>(TupleAndArray)

		attest<typeof Expected>(ArrayAndTuple)

		attest(TupleAndArray.json).equals(Expected.json)
		attest(ArrayAndTuple.json).equals(Expected.json)
	})

	it("variadic and tuple", () => {
		const B = type([{ b: "boolean" }, "[]"])
		const T = type([{ a: "string" }, "...", B]).and([
			{ c: "number" },
			{ d: "Date" }
		])
		const Expected = type([
			{ a: "string", c: "number" },
			{ b: "boolean", d: "Date" }
		])
		attest(T.json).equals(Expected.json)
	})

	it("variadic and array", () => {
		const B = type({ b: "boolean" }, "[]")
		const T = type([{ a: "string" }, "...", B]).and([{ c: "number" }, "[]"])
		const Expected = type([
			{ a: "string", c: "number" },
			"...",
			[{ b: "boolean", c: "number" }, "[]"]
		])
		attest<typeof Expected.infer>(T.infer)
		attest(T.json).equals(Expected.json)
	})

	// based on the equivalent type-level test from @ark/util
	it("kitchen sink", () => {
		const L = type([
			{ a: "0" },
			[{ b: "1" }, "?"],
			[{ c: "2" }, "?"],
			"...",
			[{ d: "3" }, "[]"]
		])
		const R = type([
			[{ e: "4" }, "?"],
			[{ f: "5" }, "?"],
			"...",
			[{ g: "6" }, "[]"]
		])
		const T = L.and(R)

		const Expected = type([
			{ a: "0", e: "4" },
			[{ b: "1", f: "5" }, "?"],
			[{ c: "2", g: "6" }, "?"],
			"...",
			[{ d: "3", g: "6" }, "[]"]
		])

		attest(T.expression).snap(
			"[{ a: 0, e: 4 }, { b: 1, f: 5 }?, { c: 2, g: 6 }?, ...{ d: 3, g: 6 }[]]"
		)

		attest<typeof Expected>(T)
		attest(T.expression).equals(Expected.expression)
	})

	it("prefix and postfix", () => {
		const L = type(["...", [{ a: "0" }, "[]"], { b: "0" }, { c: "0" }])
		const R = type([{ x: "0" }, { y: "0" }, "...", [{ z: "0" }, "[]"]])

		const Expected = type([
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

		const LrResult = L.and(R)
		attest(LrResult.json).snap(Expected.json)
		const RlResult = R.and(L)
		attest(RlResult.json).snap(Expected.json)
	})
})
