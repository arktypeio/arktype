import { attest, contextualize } from "@ark/attest"
import { arkUtilVersion } from "@ark/util"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readPackageJson } from "../../fs/index.ts"

contextualize(() => {
	it("version matches package.json", () => {
		const { version } = readPackageJson()
		attest(arkUtilVersion).equals(version)
	})
})
