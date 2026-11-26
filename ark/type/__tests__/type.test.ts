import { attest, contextualize } from "@ark/attest"
import { TraversalError, type JsonSchema, type UnitNode } from "@ark/schema"
import { flatMorph, type equals } from "@ark/util"
import {
	declare,
	fn,
	Generic,
	generic,
	keywords,
	match,
	scope,
	Type,
	type,
	type Ark
} from "arktype"
import { codec } from "arktype/codecs"
import * as assert from "node:assert/strict"

contextualize(() => {
	it("root discriminates", () => {
		const T = type("string")
		const out = T("")
		if (out instanceof type.errors) out.throw()
		else attest<string>(out)
	})

	it("allows", () => {
		const T = type("number%2")
		const data: unknown = 4
		if (T.allows(data)) {
			// narrows correctly
			attest<number>(data)
		} else throw new Error()

		attest(T.allows(5)).equals(false)
	})

	it("allows doc example", () => {
		const Numeric = type("number | bigint")
		const numerics = [0, "one", 2n].filter(Numeric.allows)
		attest(numerics).snap([0, 2n])
	})

	it("extends doc example", () => {
		const N = type(Math.random() > 0.5 ? "boolean" : "string")
		attest(N.expression).satisfies("string | boolean")
		attest(N.t).type.toString.snap("string | boolean")
		const ez = N.ifExtends("boolean")
		attest(ez?.expression).satisfies("'boolean' | undefined")
		attest(ez?.t).type.toString.snap("boolean | undefined")
	})

	it("errors can be thrown", () => {
		const T = type("number")
		try {
			const result = T("invalid")
			if (result instanceof type.errors) result.throw()
		} catch (e) {
			attest(e).instanceOf(TraversalError)
			attest((e as TraversalError).arkErrors instanceof type.errors)
			return
		}
		throw new assert.AssertionError({ message: "Expected to throw" })
	})

	it("assert", () => {
		const T = type({ a: "string" })
		attest(T.assert({ a: "1" })).equals({ a: "1" })
		attest(() => T.assert({ a: 1 })).throws.snap(
			"TraversalError: a must be a string"
		)
	})

	it("select", () => {
		const Units = type("'red' | 'blue'").select("unit")

		attest<UnitNode[]>(Units)
		attest(Units).snap([{ unit: "blue" }, { unit: "red" }])
	})

	it("is treated as covariant", () => {
		type("1") satisfies Type<number>

		// @ts-expect-error
		attest(() => type("1") satisfies Type<string>).type.errors(
			"missing the following properties from type 'Type<string, {}>'"
		)

		// errors correctly if t is declared as its own type param
		const accept = <t extends string>(t: Type<t>) => t

		const T = type("1")

		// @ts-expect-error
		attest(() => accept(T)).type.errors(
			"Type 'Type<1, {}>' is missing the following properties from type 'Type<string, {}>'"
		)
	})

	// the negative cases of these assignability tests
	// contribute a ton of instantiations and check time

	it("base signature obeys assignability rules", () => {
		type("'foo'[]") satisfies Type<string[]>

		// @ts-expect-error
		attest(() => type("number[]") satisfies Type<string[]>).type.errors(
			"Type 'Type<number, {}>' is missing the following properties from type 'Type<string, {}>'"
		)
		attest.instantiations([248683, "instantiations"])
	})

	it("args signature obeys assignability rules", () => {
		type("'foo'", "[]") satisfies Type<string[]>

		// @ts-expect-error
		attest(() => type("number", "[]") satisfies Type<string[]>).type.errors(
			"Type 'Type<number, {}>' is missing the following properties from type 'Type<string, {}>'"
		)
		attest.instantiations([249815, "instantiations"])
	})

	// parsing "'foo'[]" alone is ~817, so the passing check itself costs ~34
	it("passing satisfies check", () => {
		type("'foo'[]") satisfies Type<string[]>
		attest.instantiations([851, "instantiations"])
	})

	it("type.Any allows arbitrary scope", () => {
		const foo = scope({
			foo: "string"
		}).resolve("foo")

		foo satisfies type.Any<string>

		// @ts-expect-error (fails with default ambient type)
		attest((): Type<string> => foo).type.errors(
			"Type<string, { foo: string; }>' is not assignable to type 'Type<string, {}>'"
		)
	})

	it("distribute", () => {
		const T = type("===", 0, "1", "2", 3, "4", 5)

		const numbers = T.distribute(
			n =>
				n.ifExtends(type.number) ??
				type.raw(n.expression.slice(1, -1)).as<number>(),
			branches => type.raw(branches).as<number[]>()
		)

		attest(numbers.expression).snap("[1, 2, 4, 0, 3, 5]")
	})

	it("attached types", () => {
		const attachments: Record<keyof Ark.typeAttachments, string | object> =
			flatMorph({ ...type }, (k, v) =>
				v instanceof Type ? [k, v.expression]
				: v instanceof Generic ? [k, v.json]
				: []
			)

		attest(attachments).snap({
			bigint: "bigint",
			boolean: "boolean",
			false: "false",
			never: "never",
			null: "null",
			number: "number",
			object: "object",
			string: "string",
			symbol: "symbol",
			true: "true",
			unknown: "unknown",
			undefined: "undefined",
			arrayIndex: type.arrayIndex.expression,
			Key: "string | symbol",
			Record: keywords.Record.internal.json,
			Date: "Date",
			Array: "Array"
		})

		attest<number>(type.number.t)
	})

	it("ark attached", () => {
		attest<string>(type.keywords.number.integer.expression).snap("number % 1")
	})

	it("unit", () => {
		const T = type.unit(5)
		attest<5>(T.t)
		attest(T.expression).equals("5")
	})

	it("enumerated", () => {
		const T = type.enumerated(5, true, null)
		attest<5 | true | null>(T.t)
		attest(T.expression).snap("5 | null | true")
	})

	it("schema", () => {
		const T = type.schema({ domain: "string" })
		// uninferred for now
		attest<unknown>(T.t)
		attest(T.expression).equals("string")
	})

	it("ifEquals", () => {
		const T = type("string")
		attest(T.ifEquals("string")).equals(T)
		// subtype
		attest(T.ifEquals("'foo'")).equals(undefined)
		// supertype
		attest(T.ifEquals("string | number")).equals(undefined)
	})

	it("ifExtends", () => {
		const T = type("string")
		attest<type<string> | undefined>(T.ifExtends("string")).equals(T)
		// subtype
		attest<type<"foo"> | undefined>(T.ifExtends("'foo'")).equals(undefined)
		// supertype
		attest<type<string | number> | undefined>(
			T.ifExtends("string | number")
		).equals(T)
	})

	it("allows assignment to unparameterized Type", () => {
		const T = type({
			name: "string >= 2",
			email: "string.email"
		})

		T satisfies Type
	})

	it("allows morph assignment to unparameterized Type", () => {
		const T = type("string").pipe(s => s.length)

		T satisfies Type
	})

	it("assert callable as standalone function", () => {
		const { assert } = type("string")

		attest<(data: unknown) => string>(assert)
		attest(assert("foo")).equals("foo")
		attest(() => assert(5)).throws.snap("TraversalError: must be a string")
	})

	it("is unbound", () => {
		attest(type("string").name).equals("")
	})

	it("toString()", () => {
		// represent a variety of structures to ensure it is correctly composed
		const T = type({
			"[string]": "number | unknown[]",
			a: "1",
			"b?": "2",
			c: ["0 < string < 5", "boolean?", "...", "number[]"],
			d: [
				["string", "=>", s => s.length],
				"0 < number % 2 < 100",
				"...",
				"bigint[]",
				"(/^a.*z$/ & string.lower)[]"
			]
		})
		attest(T.expression).snap(
			"{ [string]: number | Array, a: 1, c: [1 <= string <= 4, boolean?, ...number[]], d: [(In: string) => Out<unknown>, 0 < number % 2 < 100, ...bigint[], (In: /^a.*z$/) => Out</^[^A-Z]*$/>[]], b?: 2 }"
		)
		attest(`${T}`).equals(`Type<${T.expression}>`)
	})

	it("valueOf", () => {
		//    🪦R.I.P. TS enums🪦
		//         2012-2025
		// Killed by --erasableSyntaxOnly

		// enum TsEnum {
		// 	numeric = 1,
		// 	symmetrical = "symmetrical",
		// 	asymmetrical = "lacirtemmysa"
		// }

		const EquivalentObject = {
			numeric: 1,
			symmetrical: "symmetrical",
			asymmetrical: "lacirtemmysa"
		} as const

		// TS reverse assigns numeric values
		// need to make sure we don't extract them at runtime

		// Object.assign avoids TS inferring this key (it wouldn't for an enum)
		Object.assign(EquivalentObject, {
			"1": "numeric"
		})

		const T = type.valueOf(EquivalentObject)

		const Expected = type.enumerated(1, "symmetrical", "lacirtemmysa")

		attest<typeof Expected>(T)
		attest(T.expression).equals(Expected.expression)
	})

	it("toJsonSchema docs", () => {
		const User = type({
			name: "string",
			email: "string.email",
			"age?": "number >= 18"
		})

		const schema = User.toJsonSchema()

		const expected: JsonSchema = {
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: {
				name: { type: "string" },
				email: {
					type: "string",
					format: "email",
					pattern: "^[\\w%+.-]+@[\\d.A-Za-z-]+\\.[A-Za-z]{2,}$"
				},
				age: { type: "number", minimum: 18 }
			},
			required: ["email", "name"]
		}

		attest(schema).equals(expected)
	})

	it("type.infer distills to Out, matching typeof T.infer", () => {
		const EpochMs = codec("number.integer", "Date", {
			decode: n => new Date(n),
			encode: d => d.getTime()
		})
		const User = type({
			name: "string",
			age: "string.numeric.parse",
			len: type("string").pipe(s => s.length),
			count: "number = 5",
			at: EpochMs,
			"bio?": "string",
			id: type("string").brand("userId"),
			nested: {
				at: EpochMs,
				score: "number = 0"
			},
			pair: ["string.numeric.parse", "number = 1"]
		})

		attest<typeof User.infer, type.infer<typeof User>>()
		attest<true, equals<type.infer<typeof User>, typeof User.infer>>()
		attest<typeof User.inferOut, type.infer.Out<typeof User>>()
		attest<typeof User.inferIn, type.infer.In<typeof User>>()
		attest<
			typeof User.inferIntrospectableOut,
			type.infer.introspectable.Out<typeof User>
		>()

		attest<
			{ age: number; count: number },
			type.infer<{ age: "string.numeric.parse"; count: "number = 5" }>
		>()
		attest<
			{ age: string; count?: number },
			type.infer.In<{ age: "string.numeric.parse"; count: "number = 5" }>
		>()
		attest<Date, type.infer<typeof EpochMs>>()
		attest<number, type.infer.In<typeof EpochMs>>()

		const $ = scope({ id: "string.numeric.parse" })
		attest<number, type.infer<"id", typeof $.t>>()
		attest<string, type.infer.In<"id", typeof $.t>>()

		const Node = scope({
			Node: { v: "string.numeric.parse", "kids?": "Node[]" }
		}).export().Node
		attest<typeof Node.infer, type.infer<typeof Node>>()
	})

	it("internal combinators preserve morphs and defaults", () => {
		const OrNary = type.or("string.numeric.parse", "boolean")
		attest<string | boolean>(OrNary.inferIn)
		attest<number | boolean>(OrNary.infer)

		const OrChained = type("boolean").or("string.numeric.parse")
		attest<boolean | string>(OrChained.inferIn)
		attest<boolean | number>(OrChained.infer)

		const AndChained = type({ a: "string" }).and({
			b: "string.numeric.parse"
		})
		attest<{ a: string; b: string }>(AndChained.inferIn)
		attest<{ a: string; b: number }>(AndChained.infer)

		const MergedChained = type({ a: "string" }).merge({
			b: "string.numeric.parse",
			c: "number = 5"
		})
		attest<{ a: string; b: string; c?: number }>(MergedChained.inferIn)
		attest<{ a: string; b: number; c: number }>(MergedChained.infer)

		const MergedNary = type.merge(
			{ a: "string" },
			{ b: "string.numeric.parse", c: "number = 5" }
		)
		attest<{ a: string; b: string; c?: number }>(MergedNary.inferIn)
		attest<{ a: string; b: number; c: number }>(MergedNary.infer)

		const Piped = type("string").to("string.numeric.parse")
		attest<string>(Piped.inferIn)
		attest<number>(Piped.infer)

		const Parse = fn("string", ":", "string.numeric.parse")(s => s)
		attest<number>(Parse("42"))
		attest<string>(Parse.returns.inferIn)
		attest<number>(Parse.returns.infer)

		const Box = generic("t")({ v: "t" })
		const NumBox = Box("string.numeric.parse")
		attest<{ v: string }>(NumBox.inferIn)
		attest<{ v: number }>(NumBox.infer)

		const Matched = match
			.case("string.numeric.parse", n => n + 1)
			.default("assert")
		attest<string>(Matched.inferIn)
		attest<number>(Matched.infer)

		const Declared = declare<
			{ a: number },
			{ assignable: true; side: "out" }
		>().type({ a: "string.numeric.parse" })
		attest<{ a: string }>(Declared.inferIn)
		attest<{ a: number }>(Declared.infer)
	})

	it("assigns array, tuple, and Date Types to Type<object>", () => {
		const takesObj = (t: Type<object>) => t
		takesObj(type("string[]"))
		takesObj(type(["string", "number"]))
		takesObj(type("Date"))
		takesObj(type("string[]#Tags"))
		takesObj(type("Date#Created"))
		takesObj(type({ a: "string" }))

		// @ts-expect-error
		attest(() => takesObj(type("string"))).type.errors(
			"is missing the following properties from type 'Type<object, {}>'"
		)
	})
})
