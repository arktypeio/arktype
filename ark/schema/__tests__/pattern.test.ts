import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import {
	ipv4Matcher,
	ipv6Matcher,
	iso8601Matcher,
	numericStringMatcher,
	uuidMatcher,
	wellFormedIntegerMatcher
} from "@ark/util"

// each string of up to `length` characters from `alphabet`
const stringsUpTo = (alphabet: string, length: number): string[] => {
	const strings = [""]
	for (let i = 0; strings[i].length < length; i++)
		for (const char of alphabet) strings.push(strings[i] + char)
	return strings
}

// s, and each string one char from `chars` inserted, replaced or deleted away
const edits = (s: string, chars: string): string[] => {
	const results = [s]
	for (let i = 0; i <= s.length; i++) {
		if (i < s.length) results.push(s.slice(0, i) + s.slice(i + 1))
		for (const char of chars) {
			results.push(s.slice(0, i) + char + s.slice(i))
			if (i < s.length) results.push(s.slice(0, i) + char + s.slice(i + 1))
		}
	}
	return results
}

const twoDigits = Array.from({ length: 100 }, (_, i) => `${i}`.padStart(2, "0"))

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

	// each one-char edit of a UUID, nil and max included, and each pair of
	// version and variant chars
	it("UUIDs", () => {
		const uuid = "20354d7a-e4fe-47Af-8fF6-187bca92f3f9"
		const data = [
			"00000000-0000-0000-0000-000000000000",
			"ffffffff-ffff-ffff-ffff-ffffffffffff",
			uuid
		].flatMap(s => edits(s, "09afAFgG-\u0130"))
		for (const version of "08aF-g") {
			for (const variant of "79abcAB-") {
				data.push(
					`${uuid.slice(0, 14)}${version}${uuid.slice(15, 19)}${variant}${uuid.slice(20)}`
				)
			}
		}
		attest(mismatches(uuidMatcher, data)).equals([])
	})

	it("IPv4 addresses", () => {
		const segments = [
			...Array.from({ length: 1000 }, (_, i) => `${i}`),
			"",
			"00",
			"01",
			"0255"
		]
		const data = segments.flatMap(segment =>
			[0, 1, 2, 3].map(i => {
				const address = ["1", "10", "255", "0"]
				address[i] = segment
				return address.join(".")
			})
		)
		attest(
			mismatches(ipv4Matcher, [...data, ...stringsUpTo("0129.a", 6)])
		).equals([])
	})

	// length 7 reaches each arrangement of colons around a segment, an
	// IPv4 address's dots and a zone
	it("IPv6 addresses", () => {
		const segments = (n: number) =>
			Array.from({ length: n }, (_, i) => (i % 2 ? "ffff" : "0")).join(":")
		const addresses: string[] = []
		for (let left = 0; left <= 8; left++) {
			for (let right = 0; right <= 8; right++)
				addresses.push(`${segments(left)}::${segments(right)}`)
			addresses.push(segments(left))
		}
		const data = [
			...stringsUpTo("0a:.%", 7),
			...edits("2001:0db8:85a3:08d3:1319:8a2e:0370:7344", "0fFg:.%")
		]
		for (const address of addresses) {
			for (const tail of [
				"",
				":1.2.3.4",
				":256.1.1.1",
				":1.2.3",
				":1.2.3.4.5"
			]) {
				for (const zone of ["", "%", "%eth0.1", "%-"])
					data.push(`${address}${tail}${zone}`)
			}
		}
		attest(mismatches(ipv6Matcher, data)).equals([])
	})

	// each field's every 2 digits, and each one-char edit of a date with
	// each part of a time
	it("ISO 8601 dates", () => {
		const data = stringsUpTo("09-T:Z.+", 5)
		for (const n of twoDigits) {
			data.push(
				`2021-${n}-01`,
				`2021-02-${n}`,
				`2021-02-01T${n}:00:00Z`,
				`2021-02-01T00:${n}:00`,
				`2021-02-01T00:00:${n}.5`,
				`2021-02-01T00:00:00+${n}:00`,
				`2021-02-01T00:00:00-00:${n}`
			)
		}
		for (const s of [
			"2021-01-01T00:00:00.",
			"2021-01-01T00:00:00.000+05:30",
			"2021-12-31T23:59:59,9Z",
			"2021-01-01"
		])
			data.push(...edits(s, "09-T:Z.,+z"))
		attest(mismatches(iso8601Matcher, data)).equals([])
	})

	// what a pattern can read differently from the check standing in for it
	describe("each string a format's check could read unlike its pattern", () => {
		// line terminators $ doesn't match before, what \\d and a class must
		// not take for a digit or hex char, what case folding could, and lone
		// surrogates and a pair
		const adversarial = [
			"\n",
			"\r",
			"\u2028",
			"\u2029",
			"\0",
			" ",
			"\u0660",
			"\uff10",
			"\uff21",
			"\u0130",
			"\u0131",
			"\u017f",
			"\u212a",
			"\ud83d",
			"\ude00",
			"\u{1f600}"
		]
		let state = 1
		// xorshift, so a failure reproduces
		const random = (n: number) => {
			state ^= state << 13
			state ^= state >>> 17
			state ^= state << 5
			return (state >>> 0) % n
		}
		const pick = <t>(values: readonly t[]) => values[random(values.length)]

		// valid strings, each edited up to 3 times by the chars the format reads
		const generated = (valid: readonly string[], chars: string) => {
			state = 1
			const pool = [...chars, ...adversarial]
			const data: string[] = []
			for (let i = 0; i < 100_000; i++) {
				let s = pick(valid)
				for (let edit = random(4); edit > 0; edit--) {
					const at = random(s.length + 1)
					const kept = s.slice(0, at)
					const char = pick(pool)
					s =
						pick([0, 1, 2]) === 0 ? kept + s.slice(at + 1)
						: pick([0, 1]) === 0 ? kept + char + s.slice(at)
						: kept + char + s.slice(at + 1)
				}
				data.push(s)
			}
			return data
		}

		const around = (valid: readonly string[]) =>
			valid.flatMap(s => [
				...adversarial.flatMap(char => [
					char + s,
					s + char,
					// the same length, for a check that reads it first
					char + s.slice(1),
					s.slice(0, -1) + char
				]),
				s.slice(0, -1),
				s.slice(1),
				s.toUpperCase(),
				s.toLowerCase(),
				"0".repeat(s.length),
				"f".repeat(s.length),
				s.repeat(2),
				"",
				s + "0".repeat(1_000_000),
				"0".repeat(1_000_000) + s
			])

		const uuids = [
			"20354d7a-e4fe-47Af-8fF6-187bca92f3f9",
			"00000000-0000-1000-8000-000000000000",
			"FFFFFFFF-FFFF-8FFF-bFFF-FFFFFFFFFFFF",
			"00000000-0000-0000-0000-000000000000",
			"ffffffff-ffff-ffff-ffff-ffffffffffff",
			// max's language is lowercase, and these reach it by no other branch
			"FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
			"ffffffff-ffff-0fff-ffff-ffffffffffff"
		]

		it("UUIDs", () => {
			attest(
				mismatches(uuidMatcher, [
					...around(uuids),
					...generated(uuids, "019afgAFG-")
				])
			).equals([])
		})

		const dates = [
			"2021-01-01",
			"2021-12-31T23:59:59",
			"2021-02-01T00:00:00.000Z",
			"2021-02-01T00:00:00,5z",
			"2021-02-01T00:00:00+05:30",
			"2021-02-01T00:00:00.123456789-23:59",
			// what only the pattern reads
			"+2021-02-01",
			"-2021-02",
			"20210201",
			"2021-W01-1",
			"2021-032",
			"2021-02-01T24:00",
			"2021-02-01T00:00Z",
			"2021-02-01T00:00:00.5+05"
		]

		it("ISO 8601 dates", () => {
			attest(
				mismatches(iso8601Matcher, [
					...around(dates),
					...generated(dates, "0129-T:Z.,+zW")
				])
			).equals([])
		})

		// past what a backtracking stack or a quadratic scan could take
		it("long runs", () => {
			const long = 1_000_000
			const digits = "1".repeat(long)
			attest(
				mismatches(iso8601Matcher, [
					`2021-02-01T00:00:00.${digits}`,
					`2021-02-01T00:00:00.${digits}Z`,
					`2021-02-01T00:00:00.${digits}x`,
					`2021-02-01T00:00:00.${digits}:`,
					`2021-02-01T00:00:00,${digits}+05:30`,
					`2021-02-01T00:00:00.${digits}\n`,
					digits,
					`${digits}-02-01`,
					"-".repeat(long)
				])
			).equals([])
			attest(
				mismatches(uuidMatcher, [
					"f".repeat(long),
					"-".repeat(long),
					`${"f".repeat(8)}-`.repeat(long / 9)
				])
			).equals([])
		})
	})

	it("a check leaves what its pattern writes", () => {
		attest(uuidMatcher.source).snap(
			"^(?:[\\dA-Fa-f]{8}-[\\dA-Fa-f]{4}-[1-8][\\dA-Fa-f]{3}-[89ABab][\\dA-Fa-f]{3}-[\\dA-Fa-f]{12}|0{8}-(?:0{4}-){3}0{12}|f{8}-(?:f{4}-){3}f{12})$"
		)
		attest(iso8601Matcher.source).snap(
			"^[+-]?\\d{4}(?!\\d{2}\\b)(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\\1(?:[12]\\d|0[1-9]|3[01]))?|W(?:[0-4]\\d|5[0-3])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\\d|[12]\\d{2}|3(?:[0-5]\\d|6[1-6])))(?:T(?:(?:(?:[01]\\d|2[0-3])(?:(:?)[0-5]\\d)?|24:?00)(?:[,.]\\d+(?!:))?)?(?:\\2[0-5]\\d(?:[,.]\\d+)?)?(?:[Zz]|[+-](?:[01]\\d|2[0-3]):?(?:[0-5]\\d)?)?)?)?$"
		)
		for (const pattern of [uuidMatcher, iso8601Matcher]) {
			const T = rootSchema({ domain: "string", pattern })
			attest(T.expression).equals(`${pattern}`)
			attest(T.toJsonSchema()).equals({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "string",
				pattern: pattern.source
			})
			attest(T("x")?.toString()).equals(`must be matched by ${pattern.source}`)
		}
	})

	describe("a class counted exactly", () => {
		const testedSource = (regex: RegExp) => {
			const node = rootSchema({ domain: "string", pattern: regex })
			const pattern = node.children.find(child => child.is("pattern"))
			return pattern!.tested.source
		}

		it("writes one out past 3", () => {
			attest(testedSource(/^\d{4}$/)).snap("^\\d\\d\\d\\d$")
			attest(testedSource(/^\d{3}$/)).snap("^\\d{3}$")
			attest(testedSource(/^[\]a]{4}-\W{5}/)).snap(
				"^[\\]a][\\]a][\\]a][\\]a]-\\W\\W\\W\\W\\W"
			)
			attest(testedSource(/(?:\s{4}|[^-]{4})+/)).snap(
				"(?:\\s\\s\\s\\s|[^-][^-][^-][^-])+"
			)
		})

		it("leaves whatever else reads as counted", () => {
			for (const source of [
				String.raw`\\d{4}`,
				String.raw`\[a]{4}`,
				String.raw`[\d{4}]`,
				String.raw`[\]{4}]`,
				String.raw`\u0041{4}`,
				String.raw`\x41{4}`,
				"a{4}",
				"(a){4}",
				"(?:ab){4}",
				String.raw`(a)\1{4}`,
				String.raw`\d{4}?`,
				String.raw`\d{4,}`,
				String.raw`\d{4,6}`,
				String.raw`\d{,4}`,
				String.raw`\d{4`
			])
				attest(testedSource(new RegExp(source))).equals(source)
			attest(testedSource(/\p{L}{4}/u)).equals(String.raw`\p{L}{4}`)
		})

		it("leaves a count too long to write out", () => {
			attest(testedSource(/^\d{512}$/)).snap("^\\d{512}$")
			const long = `^${"\\d{4}".repeat(200)}$`
			attest(testedSource(new RegExp(long))).equals(long)
		})

		it("writes out only an outermost class of v, whose classes can nest", () => {
			const v = (source: string) => new RegExp(source, "v")
			attest(testedSource(v(String.raw`[[\d]]{4}`))).equals(
				String.raw`[[\d]]{4}`
			)
			attest(testedSource(v("[[a]b]{4}"))).equals("[[a]b]{4}")
			attest(testedSource(v("[ab]{4}"))).equals("[ab][ab][ab][ab]")
			const T = rootSchema({ domain: "string", pattern: v("^[[a]b]{4}$") })
			attest(T.allows("abab")).equals(true)
			attest(T.allows("abac")).equals(false)
		})

		it("keeps a pattern's flags and what it writes", () => {
			const T = rootSchema({ domain: "string", pattern: /^[a-f]{4}$/iu })
			attest(T.allows("aBcD")).equals(true)
			attest(T.allows("aBcG")).equals(false)
			attest(T.expression).snap("/^[a-f]{4}$/iu")
			attest(
				rootSchema({ domain: "string", pattern: /^[a-f]{4}$/ }).toJsonSchema()
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "string",
				pattern: "^[a-f]{4}$"
			})
		})

		// starts from where the last match of a global pattern left off, unless reset
		it("resets lastIndex", () => {
			const T = rootSchema({ domain: "string", pattern: /\d{4}/g })
			attest(T.allows("1234")).equals(true)
			attest(T.allows("1234")).equals(true)
		})

		// each atom with a string it reads, from what a tokenizer could read wrong
		const atoms: [source: string, sample: string][] = [
			["\\d", "4"],
			["\\D", "-"],
			["\\w", "_"],
			["\\W", "]"],
			["\\s", " "],
			["\\S", "{"],
			["[a-c]", "b"],
			["[^a-c]", "\u{1f600}"],
			["[\\]]", "]"],
			["[\\\\]", "\\"],
			["[[]", "["],
			["[{4}]", "{"],
			["[\\d{4}]", "4"],
			["a", "a"],
			["\\\\", "\\"],
			["\\[", "["],
			["\\]", "]"],
			["\\{", "{"],
			["\\.", "."],
			["\\/", "/"],
			["\\x41", "A"],
			["\\u0041", "A"],
			["\\cA", "\u0001"],
			["\\0", "\0"],
			[".", "x"],
			["\ud83d", "\ud83d"]
		]
		const quantifiers: [source: string, reads: number][] = [
			["", 1],
			["?", 1],
			["*", 2],
			["+", 2],
			["{0}", 0],
			["{1}", 1],
			["{3}", 3],
			["{4}", 4],
			["{5}", 5],
			["{16}", 16],
			["{4}?", 4],
			["{4,}", 4],
			["{4,6}", 5],
			["{4,6}?", 5],
			["{,4}", 0]
		]

		it("reads as its source over generated patterns", () => {
			let state = 7
			const random = (n: number) => {
				state ^= state << 13
				state ^= state >>> 17
				state ^= state << 5
				return (state >>> 0) % n
			}
			const pick = <t>(values: readonly t[]) => values[random(values.length)]
			const noise = [..."a4-_]{}[\\\n\r\u2028", "\ud83d", "\ude00", "\u{1f600}"]

			for (let i = 0; i < 2000; i++) {
				let source = ""
				let sample = ""
				for (let parts = 1 + random(5); parts > 0; parts--) {
					const [atom, read] = pick(atoms)
					const [quantifier, reads] = pick(quantifiers)
					const wrapped = pick([0, 1, 2, 3])
					// a {,4} reads as literal text
					const literal = quantifier === "{,4}" ? read + quantifier : undefined
					const piece =
						wrapped === 0 ? `(?:${atom}${quantifier})`
						: wrapped === 1 ? `(${atom}${quantifier})`
						: `${atom}${quantifier}`
					source += piece
					sample += literal ?? read.repeat(reads)
				}
				const anchored = pick([`^${source}$`, source, `^(?:${source}|x)$`])
				const flags = pick(["", "", "i", "u", "s", "m", "g", "y"])
				let regex: RegExp
				try {
					regex = new RegExp(anchored, flags)
				} catch {
					continue
				}
				const data = [sample, `${sample}\n`, `\n${sample}`, sample.slice(1), ""]
				for (let edits = 0; edits < 8; edits++) {
					const at = random(sample.length + 1)
					data.push(
						sample.slice(0, at) + pick(noise) + sample.slice(at + random(2))
					)
				}
				const fresh = () => new RegExp(anchored, flags)
				const mismatched = data.filter(
					s =>
						rootSchema({ domain: "string", pattern: regex }).allows(s) !==
						fresh().test(s)
				)
				attest({ anchored, flags, mismatched }).equals({
					anchored,
					flags,
					mismatched: []
				})
			}
		}).timeout(60_000)
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
