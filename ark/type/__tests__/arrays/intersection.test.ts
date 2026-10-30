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

	it("length narrowing two others", () => {
		const T = type("unknown[] >= 1").and("unknown[] <= 2").and("unknown[] <= 1")
		attest(T.json).equals(type("unknown[] == 1").json)
	})

	it("length narrowing two others to one held", () => {
		const L = type(["null", "null?"])
		const R = type(["null"])

		attest(L.and(R).json).equals(R.json)
		attest(R.and(L).json).equals(R.json)
	})

	it("never optional element keeps length", () => {
		const T = type("string[]").and(["string", "number?"])
		attest(T.json).equals(type(["string"]).json)
		attest(T.allows(["a", 5])).equals(false)
	})

	it("disjoint arrays", () => {
		const T = type("string[] & number[]")
		attest(T.json).equals(type([]).json)
		attest(T.allows([])).equals(true)
		attest(T.allows([1])).equals(false)
	})

	it("disjoint variadics keep both postfixes", () => {
		const T = type(["...", "number[]", "string"]).and([
			"...",
			"boolean[]",
			"'a'"
		])
		attest(T.expression).snap('["a"]')
		attest(T.allows(["b"])).equals(false)
	})

	it("disjoint variadics between a prefix and postfix", () => {
		const T = type(["number", "...", "number[]", "string"]).and([
			"number",
			"...",
			"string[]",
			"string"
		])
		attest(T.expression).snap("[number, string]")
		attest(T.allows([0, "a"])).equals(true)
	})

	it("disjoint variadics align postfixes of different lengths", () => {
		const T = type(["...", "number[]", "string"]).and([
			"...",
			"string[]",
			"number",
			"string"
		])
		attest(T.expression).snap("[number, string]")
		attest(T.allows([0, "a"])).equals(true)
	})

	it("disjoint variadic meets a postfix", () => {
		const T = type(["...", "'a'[]", "number"]).and(["...", "0[]"])
		attest(T.expression).snap("[0]")
		attest(T.allows([1])).equals(false)
	})

	it("variadic meets a longer postfix", () => {
		const T = type(["...", "(string | number)[]", "string", "string"]).and([
			"...",
			"string[]",
			"'a'"
		])
		attest(T.expression).snap('[...string[], "a"] >= 2')
		attest(T.allows(["b", "b"])).equals(false)
	})

	it("prefix and postfix on both sides", () => {
		const T = type(["number", "...", "number[]", "string"]).and([
			"unknown",
			"...",
			"number[]",
			"unknown",
			"'a'"
		])
		attest(T.expression).snap('[...number[], "a"] >= 3')
		attest(T.allows([0, 0, "b"])).equals(false)
	})

	it("prefix meets a postfix at its end", () => {
		const T = type(["number", "number"]).and(["...", "number[]", "1"])
		attest(T.expression).snap("[number, 1]")
		attest(T.allows([0, 0])).equals(false)
	})

	it("optional element meets a postfix", () => {
		const T = type(["0", "1?"]).and(["...", "number[]", "1"])
		attest(T.expression).snap("[0, 1]")
	})

	it("optional elements meet a postfix at each length", () => {
		const T = type(["string", "string?"]).and(["...", "string[]", "'a'"])
		attest(T.expression).snap('[string, "a"] | ["a"]')
		attest(T.allows(["a", "b"])).equals(false)
	})

	it("postfix meets a prefix with neither variadic", () => {
		const T = type(["...", "number[]", "0", "number"]).and([
			"0",
			"...",
			"string[]",
			"1"
		])
		attest(T.expression).snap("[0, 1]")
	})

	it("unsatisfiable postfix at the only length both allow", () => {
		attest(() =>
			type(["number", "number", "number"]).and(["...", "number[]", "'a'"])
		).throws.snap(
			"ParseError: Intersection at [2] of number and string results in an unsatisfiable type"
		)
	})

	it("disjoint arrays with props", () => {
		const WithProp = type("string[]").and({ "p0?": "string" })
		const T = type("number[]").and(WithProp)

		attest(T.json).equals(type([]).and({ "p0?": "string" }).json)
		attest(T.allows(Object.assign([], { p0: 5 }))).equals(false)
		attest(type("number[]").or(WithProp).expression).snap(
			"{ p0?: string } & string[] | number[]"
		)
		attest(WithProp.extends("number[]")).equals(false)
		attest(type(["number[]", "&", { "x?": "1" }]).and("string[]").json).equals(
			type([]).and({ "x?": "1" }).json
		)
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

		attest(T({ name: "foo" }).toString()).snap(
			"must be an array (was an object)"
		)
		const arrayWithProps = Object.assign([], { name: "foo" })
		attest(T(arrayWithProps)).equals(arrayWithProps)
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
