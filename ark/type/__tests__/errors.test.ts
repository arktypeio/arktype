import type { ArkErrorDeclaration } from "@arktype/schema"
import type { satisfy } from "@arktype/util"

declare global {
	export interface StaticArkConfig {
		errors(): {
			special: satisfy<
				ArkErrorDeclaration,
				{
					schema: {
						isSpecial: true
					}
					data: unknown
				}
			>
		}
	}
}

describe("errors", () => {
	it("custom static", () => {
		// const e = new ArkTypeError({ code: "special" })
	})
})
