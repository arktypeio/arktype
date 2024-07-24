import { attest, contextualize } from "@ark/attest"
import { arkUtilVersion } from "@ark/util"
import { version } from "../package.json" with { type: "json" }

contextualize(() => {
	it("version matches package.json", () => {
		attest(arkUtilVersion).equals(version)
	})
})
