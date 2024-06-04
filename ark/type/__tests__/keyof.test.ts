import { attest, contextualize } from "@arktype/attest"
import { rawSchema, writeUnresolvableMessage } from "@arktype/schema"
import { type } from "arktype"
import { writeMissingRightOperandMessage } from "../parser/string/shift/operand/unenclosed.js"

contextualize(() => {
	it("autocompletion", () => {
		// @ts-expect-error
		attest(() => type("k")).completions({ k: ["keyof"] })
	})

	it("root expression", () => {
		const t = type("keyof", "Date")
		attest<keyof Date>(t.infer)
		const expected = rawSchema(Date).keyof()
		attest(t.json).equals(expected.json)
	})

	it("primitive", () => {
		const t = type("keyof bigint")
		attest<keyof bigint>(t.infer)
		const expected = type(
			"===",
			"toLocaleString",
			"toString",
			"valueOf",
			Symbol.toStringTag
		)
		attest(t.json).equals(expected.json)
	})

	it("object literal", () => {
		const t = type({ a: "123", b: "123" }).keyof()
		attest<"a" | "b">(t.infer)
		attest(t.json).equals(type("'a'|'b'").json)
	})

	it("overlapping union", () => {
		const t = type({ a: "number", b: "boolean" })
			.or({ b: "number", c: "string" })
			.keyof()
		attest<"b">(t.infer)
		attest(t.json).equals(type("'b'").json)
	})

	it("non-overlapping union", () => {
		attest(() => type({ a: "number" }).or({ b: "number" }).keyof()).throws(
			'Intersection of "a" and "b" results in an unsatisfiable type'
		)
	})

	it("tuple expression", () => {
		const t = type(["keyof", { a: "string" }])
		attest<"a">(t.infer)
		attest(t.json).equals(type("'a'").json)
	})

	it("union including non-object", () => {
		attest(() => type({ a: "number" }).or("boolean").keyof()).throws.snap(
			'ParseError: Intersection of "a" and "toString" | "valueOf" results in an unsatisfiable type'
		)
	})

	it("unsatisfiable", () => {
		attest(() => type("keyof undefined")).throws.snap(
			"ParseError: keyof undefined results in an unsatisfiable type"
		)
	})

	it("multiple keyofs", () => {
		const t = type("keyof keyof string")
		attest<"toString" | "valueOf">(t.infer)
		attest(t.json).equals(type("===", "toString", "valueOf").json)
	})

	it("groupable", () => {
		const t = type("(keyof symbol & string)[]")
		attest<("toString" | "valueOf" | "description")[]>(t.infer)
		attest(t.json).equals(
			type("===", "toString", "valueOf", "description").array().json
		)
	})

	it("intersection precedence", () => {
		const t = type("keyof symbol & symbol")
		attest<typeof Symbol.toStringTag | typeof Symbol.toPrimitive>(t.infer)
		// should be reference equal as it should just re-use the cached node
		attest(t.json).is(type("===", Symbol.toStringTag, Symbol.toPrimitive).json)
	})

	it("union precedence", () => {
		const t = type("keyof boolean | number")
		attest<"valueOf" | number>(t.infer)
		// for some reason TS doesn't include toString as a keyof boolean?
		// given it is included in keyof string, it seems like an anomaly, but we include it
		attest(t.json).equals(type("number | 'valueOf' | 'toString'").json)
	})

	it("missing operand", () => {
		// @ts-expect-error
		attest(() => type("keyof "))
			.throws(writeMissingRightOperandMessage("keyof", ""))
			// it tries to autocomplete, so this is just a possible completion that would be included
			.type.errors("keyof bigint")
	})

	it("invalid operand", () => {
		// @ts-expect-error
		attest(() => type("keyof nope")).throwsAndHasTypeError(
			writeUnresolvableMessage("nope")
		)
	})
	// TODO: numeric
	// it("array", () => {
	// 	const t = type("keyof string[]")
	// 	attest<keyof string[]>(t.infer)
	// 	// the array prototype has many items and they vary based on the JS
	// 	// flavor we're running in, so just check that the indices from the type
	// 	// and one prototype key are present as a heuristic
	// 	t.assert("0")
	// 	t.assert("354")
	// 	t.assert("map")
	// 	t.assert(Symbol.iterator)
	// 	attest(() => t.assert("0.1")).throws.snap(
	// 		'TypeError: / must be a string matching /^(?:0|(?:[1-9]\\d*))$/, "length", "at", "concat", "copyWithin", "fill", "find", "findIndex", "lastIndexOf", "pop", "push", "reverse", "shift", "unshift", "slice", "sort", "splice", "includes", "indexOf", "join", "keys", "entries", "values", "forEach", "filter", "flat", "flatMap", "map", "every", "some", "reduce", "reduceRight", "toLocaleString", "toString", "findLast", "findLastIndex", (symbol Symbol.iterator) or (symbol Symbol.unscopables) (was "0.1")'
	// 	)
	// 	attest(() => t.assert("-1")).throws.snap(
	// 		'TypeError: / must be a string matching /^(?:0|(?:[1-9]\\d*))$/, "length", "at", "concat", "copyWithin", "fill", "find", "findIndex", "lastIndexOf", "pop", "push", "reverse", "shift", "unshift", "slice", "sort", "splice", "includes", "indexOf", "join", "keys", "entries", "values", "forEach", "filter", "flat", "flatMap", "map", "every", "some", "reduce", "reduceRight", "toLocaleString", "toString", "findLast", "findLastIndex", (symbol Symbol.iterator) or (symbol Symbol.unscopables) (was "-1")'
	// 	)
	// })

	// it("tuple", () => {
	// 	const t = type(["keyof", ["string", "number"]])
	// 	attest<keyof [string, number]>(t.infer)
	// 	t.assert("1")
	// 	t.assert("map")
	// 	attest(() => t.assert("2")).throws.snap(
	// 		'TypeError: / must be "length", "0", "1", "at", "concat", "copyWithin", "fill", "find", "findIndex", "lastIndexOf", "pop", "push", "reverse", "shift", "unshift", "slice", "sort", "splice", "includes", "indexOf", "join", "keys", "entries", "values", "forEach", "filter", "flat", "flatMap", "map", "every", "some", "reduce", "reduceRight", "toLocaleString", "toString", "findLast", "findLastIndex", (symbol Symbol.iterator) or (symbol Symbol.unscopables) (was "2")'
	// 	)
	// })

	// it("wellFormedNonNegativeInteger intersection", () => {
	// 	const a = type([{ "1": "'foo'" }, "&", "string[]"])
	// 	const t = type("keyof", a)
	// 	// TODO should still include wellFormed
	// 	attest(t.toString()).snap(
	// 		'"1" or "at" or "concat" or "copyWithin" or "entries" or "every" or "fill" or "filter" or "find" or "findIndex" or "findLast" or "findLastIndex" or "flat" or "flatMap" or "forEach" or "includes" or "indexOf" or "join" or "keys" or "lastIndexOf" or "length" or "map" or "pop" or "push" or "reduce" or "reduceRight" or "reverse" or "shift" or "slice" or "some" or "sort" or "splice" or "toLocaleString" or "toString" or "unshift" or "values" or (symbol Symbol.iterator) or (symbol Symbol.unscopables) or /^(?:0|(?:[1-9]\\d*))$/'
	// 	)
	// })
})
