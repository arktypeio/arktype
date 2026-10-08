import { attest, contextualize } from "@ark/attest"
import { readPackageJson } from "@ark/fs"
import * as schemaRuntime from "@ark/schema/runtime"
import { arktypeVersion } from "arktype/internal/entry.ts"
import * as runtime from "arktype/runtime"

contextualize(() => {
	it("version matches package.json", () => {
		attest(arktypeVersion).equals(readPackageJson().version)
	})

	it("exports each of @ark/schema/runtime's values", () => {
		attest(Object.keys(schemaRuntime).filter(k => !(k in runtime))).equals([])
	})
})
