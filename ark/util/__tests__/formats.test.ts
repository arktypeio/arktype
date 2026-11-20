import { attest, contextualize } from "@ark/attest"
import { isUuid, uuidMatcher } from "@ark/util"

contextualize(() => {
	it("uuid nil and max case-insensitivity", () => {
		const valid = [
			"00000000-0000-0000-0000-000000000000",
			"ffffffff-ffff-ffff-ffff-ffffffffffff",
			"FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
			"fFfFfFfF-FfFf-fFfF-FfFf-fFfFfFfFfFfF"
		]
		for (const s of valid) {
			attest(isUuid(s)).equals(true)
			attest(uuidMatcher.test(s)).equals(true)
		}

		const invalid = [
			"FFFFFFFF-FFFF-0FFF-FFFF-FFFFFFFFFFFF",
			"ffffffff-ffff-0fff-ffff-ffffffffffff",
			"00000000-0000-0000-0000-000000000001"
		]
		for (const s of invalid) {
			attest(isUuid(s)).equals(false)
			attest(uuidMatcher.test(s)).equals(false)
		}
	})
})
