import { attest, contextualize } from "@ark/attest"
import { Scanner } from "@ark/util"

contextualize(() => {
	describe("shiftUntilEscapable", () => {
		const shiftUntilQuote = (def: string) => {
			const sc = new Scanner(def)
			return [sc.shiftUntilEscapable(s => s.peek === "'"), sc.unscanned]
		}

		it("keeps a backslash ending the input", () => {
			const sc = new Scanner("abc\\")
			attest(sc.shiftUntilEscapable(() => false)).equals("abc\\")
			attest(sc.location).equals(4)
			attest<["abc\\", ""]>({} as Scanner.shiftUntilEscapable<"abc\\", "'", "">)
		})

		it("keeps a backslash ending the input where the end is the condition", () => {
			const sc = new Scanner("abc\\")
			attest(sc.shiftUntilEscapable(s => s.peek === "")).equals("abc\\")
			attest(sc.location).equals(4)
		})

		it("reads a backslash before the terminator as the terminator", () => {
			attest(shiftUntilQuote("a\\'b'c")).equals(["a'b", "'c"])
			attest<["a'b", "'c"]>(
				{} as Scanner.shiftUntilEscapable<"a\\'b'c", "'", "">
			)
		})
	})
})
