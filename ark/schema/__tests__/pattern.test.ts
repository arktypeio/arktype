import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { numericStringMatcher, wellFormedIntegerMatcher } from "@ark/util"
import fc from "fast-check"

const loneSurrogate = fc
	.integer({ min: 0xd800, max: 0xdfff })
	.map(code => String.fromCharCode(code))

// any code point, a lone surrogate or a line terminator . excludes
const anyUnit = fc.oneof(
	fc.string({ unit: "binary", minLength: 1, maxLength: 1 }),
	loneSurrogate,
	fc.constantFrom("\n", "\r", "\u2028", "\u2029")
)

// mostly characters of the alphabet a language is written in
const stringOver = (alphabet: string, maxLength = 16) =>
	fc.string({
		unit: fc.oneof(
			{ arbitrary: fc.constantFrom(...alphabet), weight: 8 },
			anyUnit
		),
		maxLength
	})

// a sign, digits, a point and digits, each maybe empty, mostly zeros
const numberLike = fc
	.tuple(
		fc.constantFrom("", "-"),
		fc.string({ unit: fc.constantFrom("0", "0", "1", "9") }),
		fc.constantFrom("", "."),
		fc.string({ unit: fc.constantFrom("0", "0", "1", "9") }),
		fc.oneof(fc.constant(""), anyUnit)
	)
	.map(parts => parts.join(""))

// each string of up to `length` characters from `alphabet`
const stringsUpTo = (alphabet: string, length: number): string[] => {
	const strings = [""]
	for (let i = 0; strings[i].length < length; i++)
		for (const char of alphabet) strings.push(strings[i] + char)
	return strings
}

const testsAsRegExp = (regex: RegExp, data: string[]) => {
	const node = rootSchema({ domain: "string", pattern: regex })
	return data.filter(s => node.allows(s) !== regex.test(s))
}

contextualize(() => {
	describe("numeric strings", () => {
		it("each short string", () => {
			attest(
				testsAsRegExp(numericStringMatcher, stringsUpTo("-.019a", 6))
			).equals([])
		})

		it("arbitrary strings", () => {
			const node = rootSchema({
				domain: "string",
				pattern: numericStringMatcher
			})
			fc.assert(
				fc.property(
					fc.oneof(numberLike, stringOver("-.0123456789")),
					s => node.allows(s) === numericStringMatcher.test(s)
				),
				{ numRuns: 10_000 }
			)
		})
	})

	describe("integer strings", () => {
		it("each short string", () => {
			attest(
				testsAsRegExp(wellFormedIntegerMatcher, stringsUpTo("-.019a", 6))
			).equals([])
		})

		it("arbitrary strings", () => {
			const node = rootSchema({
				domain: "string",
				pattern: wellFormedIntegerMatcher
			})
			fc.assert(
				fc.property(
					fc.oneof(numberLike, stringOver("-0123456789")),
					s => node.allows(s) === wellFormedIntegerMatcher.test(s)
				),
				{ numRuns: 10_000 }
			)
		})
	})

	describe("one atom repeated", () => {
		// each atom, and characters it matches with some flags
		const atoms = {
			"[ab]": "abAB",
			"[^ab]": "xy1 ",
			"[\\]a-]": "]a-",
			"\\d": "019",
			"\\W": " .-]",
			"\\s": " \t\n\u00a0",
			".": "ab .",
			a: "aA",
			"\\.": ".",
			"[\\ud83d\\ude00a]": "a\u{1f600}\ud83d",
			"[^]": "a\n\ud83d"
		}

		const repeatedAtom = fc.tuple(
			fc.constantFrom(...Object.keys(atoms)),
			fc.constantFrom("*", "+", "{3,}"),
			fc.constantFrom("", "i", "s", "u", "isu", "d")
		)

		it("arbitrary strings", () => {
			fc.assert(
				fc.property(
					repeatedAtom.chain(([atom, quantifier, flags]) =>
						fc.tuple(
							fc.constant(new RegExp(`^${atom}${quantifier}$`, flags)),
							fc.array(
								fc.string({
									unit: fc.oneof(
										{
											arbitrary: fc.constantFrom(
												...atoms[atom as keyof typeof atoms]
											),
											weight: 30
										},
										anyUnit
									),
									maxLength: 40,
									size: "max"
								}),
								{ minLength: 1, maxLength: 8 }
							)
						)
					),
					([regex, data]) => testsAsRegExp(regex, data).length === 0
				),
				{ numRuns: 2000 }
			)
		})

		it("long strings failing at their end", () => {
			const data = [
				"ab".repeat(20),
				`${"ab".repeat(20)}c`,
				`c${"ab".repeat(20)}`
			]
			attest(testsAsRegExp(/^[ab]+$/, data)).equals([])
			attest(
				rootSchema({ domain: "string", pattern: /^[ab]+$/ }).allows(data[0])
			).equals(true)
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
