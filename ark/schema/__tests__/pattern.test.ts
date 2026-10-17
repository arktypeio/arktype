import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { numericStringMatcher, wellFormedIntegerMatcher } from "@ark/util"

// each string of up to `length` characters from `alphabet`
const stringsUpTo = (alphabet: string, length: number): string[] => {
	const strings = [""]
	for (let i = 0; strings[i].length < length; i++)
		for (const char of alphabet) strings.push(strings[i] + char)
	return strings
}

// the strings a pattern node allows unlike its RegExp
const mismatches = (regex: RegExp, data: string[]) => {
	const node = rootSchema({ domain: "string", pattern: regex })
	return data.filter(s => node.allows(s) !== regex.test(s))
}

// strings of 15 and 16 chars, the shortest matched with a sticky copy, and
// each failing at its start, middle or end
const aroundCutoff = (matched: string, unmatched: string) =>
	[15, 16].flatMap(length => {
		const s = matched.repeat(16).slice(0, length)
		return [
			s,
			`${unmatched}${s}`,
			`${s.slice(0, 8)}${unmatched}${s.slice(8)}`,
			`${s}${unmatched}`
		]
	})

contextualize(() => {
	// length 4 reaches each branch in each sign and zero state; "a" stands
	// for any other char, which every check rejects alike
	it("numeric strings", () => {
		attest(mismatches(numericStringMatcher, stringsUpTo("-.019a", 4))).equals(
			[]
		)
	})

	it("integer strings", () => {
		attest(
			mismatches(wellFormedIntegerMatcher, stringsUpTo("-.019a", 4))
		).equals([])
	})

	describe("one atom repeated", () => {
		it("atoms", () => {
			const cases: [RegExp, string, string][] = [
				[/^[ab]+$/, "ab", "c"],
				[/^[^ab]+$/, "xy", "a"],
				[/^[\]-]+$/, "]-", "a"],
				[/^\d*$/, "19", "a"],
				[/^\W+$/, " .", "a"],
				[/^.+$/, "a ", "\n"],
				[/^a{3,}$/, "a", "b"],
				[/^\.+$/, ".", "a"]
			]
			attest(
				cases.flatMap(([regex, matched, unmatched]) =>
					mismatches(regex, aroundCutoff(matched, unmatched))
				)
			).equals([])
		})

		it("flags", () => {
			const cases: [RegExp, string, string][] = [
				[/^[a-z]+$/i, "aZ", "1"],
				[/^.+$/s, "a\n", ""],
				[/^.+$/u, "\u{1f600}\ud800", "\n"],
				[/^[\u{1f600}]+$/u, "\u{1f600}", "\ud83d"],
				// eslint-disable-next-line no-misleading-character-class
				[/^[\ud83d\ude00]+$/, "\u{1f600}", "a"],
				// eslint-disable-next-line unicorn/better-regex
				[/^a+$/d, "a", "b"]
			]
			attest(
				cases.flatMap(([regex, matched, unmatched]) =>
					mismatches(regex, aroundCutoff(matched, unmatched))
				)
			).equals([])
		})

		it("matches each string from its start", () => {
			const T = rootSchema({ domain: "string", pattern: /^a+$/ })
			attest(T.allows("a".repeat(20))).equals(true)
			attest(T.allows("a".repeat(17))).equals(true)
		})

		it("lazy", () => {
			const T = rootSchema({ domain: "string", pattern: /^a+?$/ })
			attest(T.allows("a".repeat(20))).equals(true)
		})

		it("multiline", () => {
			const T = rootSchema({ domain: "string", pattern: /^a+$/m })
			attest(T.allows(`b\n${"a".repeat(20)}`)).equals(true)
		})
	})
})
