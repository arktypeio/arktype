import { attest, contextualize } from "@ark/attest"
import { intrinsic } from "@ark/schema"

contextualize(() => {
	it("base primitives", () => {
		attest(intrinsic.jsonPrimitive.toJsonSchema()).snap({
			anyOf: [
				{ type: "number" },
				{ type: "string" },
				{ type: "boolean" },
				{ const: null }
			]
		})
	})
})
