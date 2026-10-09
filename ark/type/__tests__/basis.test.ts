import { attest, contextualize } from "@ark/attest"
import { writeUnsatisfiableExpressionError } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	describe("intersections", () => {
		it("class & literal", () => {
			const a = [0]
			const Literal = type("===", a)
			const Cls = type("instanceof", Array)
			const lr = Literal.and(Cls)
			attest<number[]>(lr.infer)
			attest(lr.json).equals(Literal.json)
			const rl = Cls.and(Literal)
			attest<number[]>(rl.infer)
			attest(rl.json).equals(Literal.json)
		})

		it("unsatisfiable class & literal", () => {
			const a = [0]
			const Literal = type("===", a)
			const Cls = type("instanceof", Date)
			attest(() => Literal.and(Cls)).throws(
				writeUnsatisfiableExpressionError("")
			)
			attest(() => Cls.and(Literal)).throws(
				writeUnsatisfiableExpressionError("")
			)
		})

		it("domain & literal", () => {
			const Literal = type("'foo'")
			const Domain = type("string")
			attest(Literal.and(Domain).json).equals(Literal.json)
			attest(Domain.and(Literal).json).equals(Literal.json)
		})

		it("unsatisfiable domain & literal", () => {
			const Literal = type("'foo'")
			const Domain = type("number")
			attest(() => Literal.and(Domain)).throws(
				writeUnsatisfiableExpressionError("")
			)
			attest(() => Domain.and(Literal)).throws(
				writeUnsatisfiableExpressionError("")
			)
		})

		it("domain & class", () => {
			const Domain = type("object")
			const Cls = type("instanceof", Date)
			attest(Domain.and(Cls).json).equals(Cls.json)
			attest(Cls.and(Domain).json).equals(Cls.json)
		})
	})
})
