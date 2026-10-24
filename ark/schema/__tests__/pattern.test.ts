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
