import { attest } from "@arktype/attest"
import type { DerivableErrorContext } from "@arktype/schema"
import { type } from "arktype"

interface SpecialErrorContext extends DerivableErrorContext {
	reversesTo: string
}

declare global {
	export interface StaticArkConfig {
		errors(): {
			nonPalindrome: SpecialErrorContext
		}
	}
}

describe("errors", () => {
	it("custom static", () => {
		const palindrome = type("string", ":", (s, ctx) =>
			s === [...s].reverse().join("")
				? true
				: ctx.falsify("nonPalindrome", {
						reversesTo: [...s].reverse().join("")
					})
		)
	})
	it("infers context parameter", () => {
		attest(() =>
			type("string", ":", (s, ctx) =>
				ctx.falsify("nonPalindrome", {
					// @ts-expect-error
					reversesTo: [...s].reverse()
				})
			)
		).type.errors("Type 'string[]' is not assignable to type 'string'")
	})
})
