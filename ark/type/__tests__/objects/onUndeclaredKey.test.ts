import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeInvalidUndeclaredBehaviorMessage } from "arktype/internal/parser/objectLiteral.ts"

contextualize(() => {
	it("can parse an undeclared restriction", () => {
		const t = type({ "+": "reject" })
		attest<{}>(t.infer)
		attest(t.json).snap({ undeclared: "reject", domain: "object" })
	})
	it("fails on type definition for undeclared", () => {
		// @ts-expect-error
		attest(() => type({ "+": "string" }))
			.throws(writeInvalidUndeclaredBehaviorMessage("string"))
			.type.errors.snap(
				"Type '\"string\"' is not assignable to type 'UndeclaredKeyBehavior'."
			)
	})
	it("can escape undeclared meta key", () => {
		const t = type({ "\\+": "string" })
		attest<{ "+": string }>(t.infer)
		attest(t.json).snap({
			required: [{ key: "+", value: "string" }],
			domain: "object"
		})
	})
})
