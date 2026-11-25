// Random patterns in the JS regex subset arktype.nvim implements, run with
// `new RegExp(pattern, "iu").exec(subject)` on V8, so the Lua engine is
// checked for every construct a user's own `rules` could use, not only the
// five the extension ships.
export type RegexCase = {
	pattern: string
	subject: string
	// null when nothing matched; a group that didn't participate is null
	match: (string | null)[] | null
}

const atoms = [
	"a",
	"b",
	"A",
	"k",
	"s",
	"\\.",
	".",
	"[ab]",
	"[^a]",
	"[a-c]",
	"[^]",
	"\\w",
	"\\W",
	"\\d",
	"\\s",
	"\\S",
	"\\n",
	"[\\u200A\\u200B]",
	"\\u{1F6A2}",
	"'",
	'"',
	"<",
	">"
]
const quantifiers = [
	"",
	"",
	"",
	"*",
	"*?",
	"+",
	"+?",
	"?",
	"??",
	"{0,2}",
	"{1,2}?",
	"{2}"
]
const alphabet = [
	"a",
	"b",
	"A",
	"B",
	"c",
	"k",
	"K",
	"\u212A",
	"s",
	"\u017F",
	".",
	" ",
	"\n",
	"\r",
	"\u2028",
	"\u200A",
	"\u200B",
	"1",
	"_",
	"'",
	'"',
	"<",
	">",
	"\u{1F6A2}",
	"é",
	"É"
]

const mulberry32 = (seed: number) => () => {
	seed |= 0
	seed = (seed + 0x6d2b79f5) | 0
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const fuzzRegexCases = (count: number, seed = 1): RegexCase[] => {
	const random = mulberry32(seed)
	const pick = <t>(list: readonly t[]) =>
		list[Math.floor(random() * list.length)]
	const chance = (p: number) => random() < p

	const sequence = (depth: number, groups: { count: number }): string => {
		let out = ""
		const length = 1 + Math.floor(random() * 4)
		for (let i = 0; i < length; i++) {
			if (depth < 2 && chance(0.25)) {
				const kind = pick(["(", "(", "(?:", "(?=", "(?!"])
				if (kind === "(") groups.count++
				let body = sequence(depth + 1, groups)
				if (chance(0.3)) body += "|" + sequence(depth + 1, groups)
				out += `${kind}${body})`
				if (kind === "(" || kind === "(?:") out += pick(quantifiers)
			} else if (groups.count > 0 && chance(0.08))
				out += `\\${1 + Math.floor(random() * groups.count)}`
			else if (chance(0.05)) out += pick(["\\b", "\\B"])
			else out += pick(atoms) + pick(quantifiers)
		}
		return out
	}

	const cases: RegexCase[] = []
	while (cases.length < count) {
		const groups = { count: 0 }
		let pattern = sequence(0, groups)
		if (chance(0.2)) pattern = "^" + pattern
		if (chance(0.2)) pattern += "$"
		let regex: RegExp
		try {
			regex = new RegExp(pattern, "iu")
		} catch {
			continue
		}
		const length = Math.floor(random() * 10)
		let subject = ""
		for (let i = 0; i < length; i++) subject += pick(alphabet)
		const result = regex.exec(subject)
		// Two V8 bugs with astral characters the Lua engine follows the spec
		// on instead (neither touches the extension's rules, which the message
		// fuzz checks with astral characters): V8 tries matches between the
		// halves of a surrogate pair, and a fixed-length run of a negated class
		// before `$` counts an astral character as one code unit, so
		// `/[^a]$/u.exec("\u{1F6A2}")` is null.
		if (result && /[\uD800-\uDBFF]$/.test(subject.slice(0, result.index)))
			continue
		if (pattern.includes("$") && /[\uD800-\uDBFF]/.test(subject)) continue
		cases.push({
			pattern,
			subject,
			match: result && [...result].map(group => group ?? null)
		})
	}
	return cases
}
