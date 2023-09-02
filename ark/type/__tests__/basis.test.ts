import { attest } from "@arktype/attest"
import type { TypeRoot } from "@arktype/schema"
import { type } from "arktype"
import { suite, test } from "mocha"
import { writeUnsatisfiableExpressionError } from "../parser/semantic/validate.js"

suite("basis intersections", () => {
	test("class & literal", () => {
		const a = [0]
		const literal = type("===", a)
		const cls = type("instanceof", Array)
		attest(literal.and(cls).root).equals(literal.root).typed as TypeRoot<
			never[]
		>
		attest(cls.and(literal).root).equals(literal.root).typed as TypeRoot<
			never[]
		>
	})
	test("unsatisfiable class & literal", () => {
		const a = [0]
		const literal = type("===", a)
		const cls = type("instanceof", Date)
		attest(() => literal.and(cls)).throws(writeUnsatisfiableExpressionError(""))
	})
	attest(() => cls.and(literal)).throws(writeUnsatisfiableExpressionError(""))
	test("domain & literal", () => {
		const literal = type("'foo'")
		const domain = type("string")
		attest(literal.and(domain).root).equals(literal.root)
			.typed as TypeRoot<"foo">
		attest(domain.and(literal).root).equals(literal.root)
			.typed as TypeRoot<"foo">
	})
	test("unsatisfiable domain & literal", () => {
		const literal = type("'foo'")
		const domain = type("number")
		attest(() => literal.and(domain)).throws(
			writeUnsatisfiableExpressionError("")
		)
		attest(() => domain.and(literal)).throws(
			writeUnsatisfiableExpressionError("")
		)
	})
	test("domain & class", () => {
		const domain = type("object")
		const cls = type("instanceof", Date)
		attest(domain.and(cls).root).equals(cls.root).typed as TypeRoot<Date>
		attest(cls.and(domain).root).equals(cls.root).typed as TypeRoot<Date>
	})
})
