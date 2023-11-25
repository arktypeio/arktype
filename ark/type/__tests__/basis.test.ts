import { attest } from "@arktype/attest"
import type { Root } from "@arktype/schema"
import { type } from "arktype"
import { writeUnsatisfiableExpressionError } from "../parser/semantic/validate.js"

describe("basis intersections", () => {
	it("class & literal", () => {
		const a = [0]
		const literal = type("===", a)
		const cls = type("instanceof", Array)
		attest<Root<number[]>>(literal.and(cls).root).equals(literal.root)
		attest<Root<number[]>>(cls.and(literal).root).equals(literal.root)
	})
	it("unsatisfiable class & literal", () => {
		const a = [0]
		const literal = type("===", a)
		const cls = type("instanceof", Date)
		attest(() => literal.and(cls)).throws(writeUnsatisfiableExpressionError(""))
		attest(() => cls.and(literal)).throws(writeUnsatisfiableExpressionError(""))
	})
	it("domain & literal", () => {
		const literal = type("'foo'")
		const domain = type("string")
		attest<Root<"foo">>(literal.and(domain).root).equals(literal.root)
		attest<Root<"foo">>(domain.and(literal).root).equals(literal.root)
	})
	it("unsatisfiable domain & literal", () => {
		const literal = type("'foo'")
		const domain = type("number")
		attest(() => literal.and(domain)).throws(
			writeUnsatisfiableExpressionError("")
		)
		attest(() => domain.and(literal)).throws(
			writeUnsatisfiableExpressionError("")
		)
	})
	it("domain & class", () => {
		const domain = type("object")
		const cls = type("instanceof", Date)
		attest<Root<Date>>(domain.and(cls).root).equals(cls.root)
		attest<Root<Date>>(cls.and(domain).root).equals(cls.root)
	})
})
