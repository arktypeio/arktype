import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeUnsatisfiableExpressionError } from "../parser/semantic/validate.js"

contextualize(() => {
	describe("intersections", () => {
		it("class & literal", () => {
			const a = [0]
			const literal = type("===", a)
			const cls = type("instanceof", Array)
			const lr = literal.and(cls)
			attest<number[]>(lr.infer)
			attest(lr.json).equals(literal.json)
			const rl = cls.and(literal)
			attest<number[]>(rl.infer)
			attest(rl.json).equals(literal.json)
		})

		it("unsatisfiable class & literal", () => {
			const a = [0]
			const literal = type("===", a)
			const cls = type("instanceof", Date)
			attest(() => literal.and(cls)).throws(
				writeUnsatisfiableExpressionError("")
			)
			attest(() => cls.and(literal)).throws(
				writeUnsatisfiableExpressionError("")
			)
		})

		it("domain & literal", () => {
			const literal = type("'foo'")
			const domain = type("string")
			attest(literal.and(domain).json).equals(literal.json)
			attest(domain.and(literal).json).equals(literal.json)
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
			attest(domain.and(cls).json).equals(cls.json)
			attest(cls.and(domain).json).equals(cls.json)
		})
	})
})
