import { attest, contextualize } from "@ark/attest"
import { Scanner, type Backslash } from "@ark/util"

contextualize(() => {
	describe("shiftUntilEscapable", () => {
		it("preserves a trailing backslash without advancing past length", () => {
			const s1 = new Scanner("abc\\")
			attest(s1.shiftUntilEscapable(() => false)).equals("abc\\")
			attest(s1.location).equals(s1.length)
			attest(s1.unscanned).equals("")

			const s2 = new Scanner("abc\\")
			attest(s2.shiftUntilEscapable(s => s.peek === "")).equals("abc\\")
			attest(s2.location).equals(s2.length)
			attest(s2.unscanned).equals("")

			const s3 = new Scanner("abc\\")
			attest(s3.shiftUntilEscapable(() => false, "\\")).equals("abc\\")
			attest(s3.location).equals(s3.length)
			attest(s3.unscanned).equals("")

			const s4 = new Scanner("\\")
			attest(s4.shiftUntilEscapable(s => s.peek === "'")).equals("\\")
			attest(s4.location).equals(s4.length)

			attest<["abc\\", ""], Scanner.shiftUntilEscapable<"abc\\", never, "">>()
			attest<
				["abc\\", ""],
				Scanner.shiftUntilEscapable<"abc\\", "'", Backslash>
			>()
		})

		it("handles escaped delimiters and escaped trailing backslashes", () => {
			const s1 = new Scanner("abc\\'def'")
			attest(s1.shiftUntilEscapable(s => s.peek === "'")).equals("abc'def")
			attest(s1.peek).equals("'")

			const s2 = new Scanner("abc\\\\")
			attest(s2.shiftUntilEscapable(() => false)).equals("abc\\")
			attest(s2.location).equals(s2.length)

			const s3 = new Scanner("abc\\\\")
			attest(s3.shiftUntilEscapable(() => false, "\\")).equals("abc\\\\")
			attest(s3.location).equals(s3.length)
		})
	})
})
