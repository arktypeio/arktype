import { attest, contextualize } from "@ark/attest"
import { arkUtilVersion } from "@ark/util"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { version } from "../package.json" with { type: "json" }

contextualize(() => {
	it("version matches package.json", () => {
		attest(arkUtilVersion).equals(version)
	})
})
