import { attest, contextualize } from "@ark/attest"
import { readPackageJson } from "@ark/fs"
import { arktypeVersion } from "arktype/internal/entry.ts"

contextualize(() => {
	it("version matches package.json", () => {
		attest(arktypeVersion).equals(readPackageJson().version)
	})
})
