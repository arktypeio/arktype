import { attest, contextualize } from "@ark/attest"
import { readPackageJson } from "@ark/fs"
import { arkUtilVersion } from "@ark/util"

contextualize(() => {
	it("version matches package.json", () => {
		const { version } = readPackageJson()
		attest(arkUtilVersion).equals(version)
	})
})
