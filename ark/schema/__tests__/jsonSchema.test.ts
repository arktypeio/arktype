import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	intrinsic,
	rootNode,
	writeCyclicJsonSchemaMessage,
	writeJsonSchemaMorphMessage
} from "@ark/schema"

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

	it("errors on morph", () => {
		const morph = rootNode({
			in: "string",
			morphs: [(s: string) => Number.parseInt(s)]
		})

		attest(() => morph.toJsonSchema()).throws(
			writeJsonSchemaMorphMessage(morph.expression)
		)
	})

	it("errors on cyclic", () => {
		attest(() => $ark.intrinsic.json.toJsonSchema()).throws.snap()

		attest(() => $ark.intrinsic.json.toJsonSchema()).throws(
			writeCyclicJsonSchemaMessage($ark.intrinsic.json.expression)
		)
	})
})
