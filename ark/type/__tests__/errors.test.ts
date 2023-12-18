import type { DerivableErrorContext } from "@arktype/schema"

interface SpecialErrorContext extends DerivableErrorContext {
	isSpecial: true
}

declare global {
	export interface StaticArkConfig {
		errors(): {
			special: SpecialErrorContext
		}
	}
}

describe("errors", () => {
	it("custom static", () => {
		// const e = new ArkTypeError({ code: "special" })
	})
})
