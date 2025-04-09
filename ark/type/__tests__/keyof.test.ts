import { attest, contextualize } from "@ark/attest"
import {
	writeNonStructuralOperandMessage,
	writeUnresolvableMessage,
	writeUnsatisfiableExpressionError
} from "@ark/schema"
import { scope, type } from "arktype"
import { writeMissingRightOperandMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

contextualize(() => {
	it("autocompletion", () => {
		// @ts-expect-error
		attest(() => type("k")).completions({ k: ["keyof"] })
	})

	it("root expression", () => {
		const T = type("keyof", { foo: "string" })
		attest<"foo">(T.t)
		const Expected = type("===", "foo")
		attest(T.expression).equals(Expected.expression)
	})

	it("object literal", () => {
		const T = type({ a: "123", b: "123" }).keyof()
		attest<"a" | "b">(T.infer)
		attest(T.json).equals(type("'a'|'b'").json)
	})

	it("overlapping union", () => {
		const T = type({ a: "number", b: "boolean" })
			.or({ b: "number", c: "string" })
			.keyof()
		attest<"b">(T.infer)
		attest(T.json).equals(type("'b'").json)
	})

	it("non-overlapping union", () => {
		attest(() => type({ a: "number" }).or({ b: "number" }).keyof()).throws(
			writeUnsatisfiableExpressionError(`keyof { a: number } | { b: number }`)
		)
	})

	it("tuple expression", () => {
		const T = type(["keyof", { a: "string" }])
		attest<"a">(T.infer)
		attest(T.json).equals(type("'a'").json)
	})

	it("keyof non-object in union", () => {
		// @ts-expect-error
		attest(() => type({ a: "number" }).or("bigint").keyof())
			.throws(writeNonStructuralOperandMessage("keyof", "bigint"))
			.type.errors("Property 'keyof' does not exist")
	})

	it("non-object", () => {
		// @ts-expect-error
		attest(() => type("keyof undefined")).throwsAndHasTypeError(
			writeNonStructuralOperandMessage("keyof", "undefined")
		)
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
})

contextualize.each(
	"scoped",
	() =>
		scope({
			ab: {
				a: "1",
				"b?": "1"
			},
			bc: {
				b: "1",
				"c?": "1"
			}
		}),
	it => {
		it("multiple keyofs", $ => {
			// @ts-expect-error
			attest(() => $.type("keyof keyof ab")).throwsAndHasTypeError(
				"keyof operand must be an object"
			)
		})

		it("groupable", $ => {
			const T = $.type("(keyof ab & string)[]")
			attest<("a" | "b")[]>(T.t)
			attest(T.json).equals(type("===", "a", "b").array().json)
		})

		it("intersection precedence", $ => {
			const T = $.type("keyof bc & string")
			attest<"b" | "c">(T.t)
			attest(T.json).equals(type("===", "b", "c").json)
		})

		it("union precedence", $ => {
			const T = $.type("keyof ab | bc")
			attest<"a" | "b" | { b: 1; c?: 1 }>(T.t)
			attest(T.expression).snap('{ b: 1, c?: 1 } | "a" | "b"')
		})
	}
)
