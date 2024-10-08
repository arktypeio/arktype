import { attest, contextualize } from "@ark/attest"
import { nearestFloat } from "@ark/util"

contextualize(() => {
	describe("nearestFloat", () => {
		it("0", () => {
			attest(nearestFloat(0)).equals(Number.MIN_VALUE)
			attest(nearestFloat(0, "-")).equals(-Number.MIN_VALUE)
		})

		it("small integer", () => {
			attest(nearestFloat(2)).snap(2.0000000000000004)
			attest(nearestFloat(-2)).snap(-1.9999999999999998)
		})

		it("small decimal", () => {
			attest(nearestFloat(2.1)).snap(2.1000000000000005)
			attest(nearestFloat(-2.1)).snap(-2.0999999999999996)
		})

		it("large integer", () => {
			attest(nearestFloat(5555555555555555)).equals(5555555555555556)
			attest(nearestFloat(5555555555555555, "-")).equals(5555555555555554)
			attest(nearestFloat(-5555555555555555)).snap(-5555555555555554)
			attest(nearestFloat(-5555555555555555, "-")).equals(-5555555555555556)
		})
	})
})
