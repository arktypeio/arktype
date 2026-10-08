import { attest, contextualize } from "@ark/attest"
import * as schemaRuntime from "@ark/schema/runtime"
import * as runtime from "arktype/runtime"

contextualize(() => {
	it("exports each of @ark/schema/runtime's values", () => {
		attest(Object.keys(schemaRuntime).filter(k => !(k in runtime))).equals([])
	})
})
