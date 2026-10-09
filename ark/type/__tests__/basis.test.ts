import { attest, contextualize } from "@ark/attest"
import { toJson, writeUnsatisfiableExpressionError } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	describe("intersections", () => {
		it("class & literal", () => {
			const a = [0]
			const Literal = type("===", a)
			const Cls = type("instanceof", Array)
			const lr = Literal.and(Cls)
			attest<number[]>(lr.infer)
			attest(toJson(lr)).equals(toJson(Literal))
			const rl = Cls.and(Literal)
			attest<number[]>(rl.infer)
			attest(toJson(rl)).equals(toJson(Literal))
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
			attest(toJson(Literal.and(Domain))).equals(toJson(Literal))
			attest(toJson(Domain.and(Literal))).equals(toJson(Literal))
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
			attest(toJson(Domain.and(Cls))).equals(toJson(Cls))
			attest(toJson(Cls.and(Domain))).equals(toJson(Cls))
		})
	})
})
