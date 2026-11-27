import { rngFrom, StructureGen } from "./gen.ts"
import {
	evaluate,
	isCoded,
	toCode,
	type Case,
	type Outcome
} from "./harness.ts"

// each generated definition, as type() parses it and as TypeScript checks it,
// which must agree on whether it's valid unless a known asymmetry below says why
// not: pnpm testParity [seeds] [definitions] [firstSeed]
const [seeds = 2, count = 500, firstSeed = 1] = process.argv
	.slice(2)
	.map(Number)

// outcomes where one side accepts what the other rejects; the rest (a message
// worded differently, a completion where runtime has an error) are counted only
const acceptanceKinds = new Set([
	"typeChecksButThrows",
	"typeErrorButRuns",
	"runtimeAllowsStaticRejects",
	"staticAllowsRuntimeRejects",
	"outRuntimeAllowsStaticRejects",
	"outStaticAllowsRuntimeRejects",
	"nonParseError",
	"throwsAtRead"
])

type Known = {
	kind: string
	/** what the asymmetry is, and where it's pinned or why it's left */
	why: string
	matches: (c: Case, o: Outcome) => boolean
}

const runtimeSays =
	(pattern: RegExp) =>
	(_: Case, o: Outcome): boolean =>
		pattern.test(o.runtime)

const staticSays =
	(pattern: RegExp) =>
	(_: Case, o: Outcome): boolean =>
		pattern.test(o.static)

const escapeRegex = (s: string) => s.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")

const known: Known[] = [
	{
		kind: "outRuntimeAllowsStaticRejects",
		why: "a brand is in the output TypeScript infers, where runtime has nothing to check",
		matches: staticSays(/Brand<|" brand"/)
	},
	{
		kind: "outStaticAllowsRuntimeRejects",
		why: "a morph from never is never at runtime, where TypeScript infers the output it would have (not fixed)",
		matches: (_, o) => /^never out rejects/.test(o.runtime)
	},
	{
		kind: "outStaticAllowsRuntimeRejects",
		why: "an object's undeclared key behavior isn't in its type",
		matches: c => /"\+": "(?:reject|delete)"/.test(toCode(c.def))
	},
	{
		kind: "typeChecksButThrows",
		why: "an empty intersection, or a keyof with no keys, is found by intersecting nodes (intersection.test, keyof.test)",
		matches: runtimeSays(/results in an unsatisfiable type/)
	},
	{
		kind: "typeChecksButThrows",
		why: "a malformed number literal as a limit is checked at runtime (range.test: fails at runtime)",
		matches: (c, o) => {
			const literal = /'([^']+)' was parsed as a (?:number|bigint)/.exec(
				o.runtime
			)?.[1]
			if (literal === undefined) return false
			const asLimit = new RegExp(
				`[<>=]\\s*${escapeRegex(literal)}|${escapeRegex(literal)}\\s*[<>=]`
			)
			return stringsIn([c.def, c.args]).some(s => asLimit.test(s))
		}
	},
	{
		kind: "typeChecksButThrows",
		why: "a length bound that isn't a positive integer, or a divisor that isn't a non-zero integer (range.test, divisor.test)",
		matches: runtimeSays(
			/(?:length bound|% operator) must be (?:a positive integer|followed by a non-zero integer)|divisor must be an integer/i
		)
	},
	{
		kind: "typeChecksButThrows",
		why: "NaN and Infinity are number to TypeScript, so bounding one, dividing one, or defaulting to one isn't caught (not fixed)",
		matches: runtimeSays(
			/(?:Bounded expression|Min operand|Max operand|Divisor operand) .*\((?:was )?-?(?:NaN|Infinity)\)|Bounded expression -?(?:NaN|Infinity) must|Default (?:for .+ )?must be -?(?:NaN|Infinity)|must be assignable to .*\(was [^)]*\b(?:NaN|Infinity)\b|bound must be a number \(was NaN\)/
		)
	},
	{
		kind: "typeChecksButThrows",
		why: "any absorbs what it's an operand of in TypeScript, where at runtime it's unknown (not fixed)",
		matches: c => isAnyOperand(c)
	},
	{
		kind: "typeChecksButThrows",
		why: "a Date literal's content, and a regex's beyond what ArkRegex parses, are read by the runtime (dateLiteral.test, regex/errors.mdx)",
		matches: runtimeSays(/Date literal|Invalid regular expression/)
	},
	{
		kind: "typeChecksButThrows",
		why: "whether morphs' inputs overlap is found by intersecting nodes (union.test, intersection.test)",
		matches: runtimeSays(
			/An unordered union of a type including a morph|intersection of distinct morphs/
		)
	},
	{
		kind: "typeChecksButThrows",
		why: "a narrowed default is checked against its base when defined, where TypeScript has only the base's type (defaults.test: narrowed default is checked when defined)",
		matches: (c, o) =>
			/Default (?:for .+ )?must be matched by/.test(o.runtime) ||
			(/Default (?:for .+ )?must be/.test(o.runtime) &&
				/string\.|number\.|unknown\.any|Infinity|NaN|\/\s*=|d'|[%<>]/.test(
					toCode(c.def)
				))
	},
	{
		kind: "typeChecksButThrows",
		why: "string keywords and literals are all string to TypeScript, so Extract and Exclude can leave never where runtime leaves a Type an operator can't take",
		matches: c => /Extract<|Exclude</.test(toCode(c.def))
	},
	{
		kind: "typeChecksButThrows",
		why: "an expression that reduces to a number or Date literal, like (unknown&5), is a left bound's limit at runtime, where the type takes only a literal written as one (not fixed)",
		matches: (c, o) =>
			/Left-bounded expressions must specify|Left bounds are only valid/.test(
				o.runtime
			) && /\(/.test(toCode(c.def))
	},
	{
		kind: "typeChecksButThrows",
		why: "spreading or merging a Date, an array or another builtin is rejected by its proto (spread.test: errors on proto node)",
		matches: runtimeSays(
			/(?:Spread|merge) operand must resolve to an object literal type \(was (?:[A-Z]\w*|.+\[]|\[.*]|d'.*|.*\b(?:Map|Set|Date|Array|RegExp|Error|Function|Promise|WeakMap|WeakSet)\b.*)\)$/
		)
	},
	{
		kind: "typeChecksButThrows",
		why: "TypeScript can't see the order of an object literal's keys",
		matches: runtimeSays(/Spread operator may only be used as the first key/)
	},
	{
		kind: "typeChecksButThrows",
		why: "a key both required and optional (props.test: duplicate optional key)",
		matches: runtimeSays(/Duplicate key/)
	},
	{
		kind: "typeChecksButThrows",
		why: "a shallow cycle through a generic isn't seen by its type (not fixed)",
		matches: (c, o) =>
			/has a shallow resolution cycle/.test(o.runtime) &&
			toCode(c.def).includes("<")
	},
	{
		kind: "typeChecksButThrows",
		why: "a generic instantiating itself with new args each time is cut off at runtime, where TypeScript gives up on it as any (not fixed)",
		matches: runtimeSays(/recursed with new arguments more than \d+ times/)
	},
	{
		kind: "typeChecksButThrows",
		why: "a second brand intersects the first's id to never, so the type reads as any object (not fixed)",
		matches: c => /#[^\s#]+[\s)]*#/.test(codeOf(c))
	},
	{
		kind: "typeChecksButThrows",
		why: "a brand intersects what it brands with an object, so a branded primitive passes for an object (not fixed)",
		matches: (c, o) =>
			/must be assignable to object/.test(o.runtime) && /#/.test(codeOf(c))
	},
	{
		kind: "typeChecksButThrows",
		why: "a fluent method's operand is checked by the method's signature, which takes any Type",
		matches: (c, o) =>
			c.context === "fluent" &&
			/operand must be an object|must be assignable to|does not exist on|must be non-zero/.test(
				o.runtime
			)
	},
	{
		kind: "typeChecksButThrows",
		why: "Pick and Omit in a string take any key, where runtime checks the object has it (keywords/pick.test: invalid key, via .pick)",
		matches: (c, o) =>
			/Key .* does not exist on/.test(o.runtime) &&
			/(?:Pick|Omit)\s*</.test(codeOf(c))
	},
	{
		kind: "typeChecksButThrows",
		why: "whitespace after an optional's '?' is skipped at runtime, where the type doesn't see the '?' (not fixed)",
		matches: c => stringsIn(c.def).some(s => /\?\s+$/.test(s))
	},
	{
		kind: "typeChecksButThrows",
		why: "a generic's body is checked with its params as their constraints, not as each arg, so a morph satisfying a constraint can be an operand the body can't take (not fixed)",
		matches: (c, o) =>
			c.context === "generic" && /\(was a morph\)/.test(o.runtime)
	},
	{
		kind: "typeChecksButThrows",
		why: "a brand on null or undefined intersects it with an object, which TypeScript reduces to never (not fixed)",
		matches: c => isNullishBrand(c)
	},
	{
		kind: "typeChecksButThrows",
		why: "keyof an alias whose definition reaches back to the keyof is read before the alias resolves at runtime, where TypeScript needs only its keys (not fixed)",
		matches: runtimeSays(/keyof operand must be an object \(was \$\w+\)/)
	},
	{
		kind: "typeChecksButThrows",
		why: "a function other than a class passes the type unread, since reading a thunk's return type can cycle through its scope (definition.ts: validateTerminalObject)",
		matches: runtimeSays(
			/Type definitions must be strings or objects \(was Function\)/
		)
	},
	{
		kind: "typeChecksButThrows",
		why: "merge checks each branch of an operand is an object, which a morph is to TypeScript, so a morph or a union with an object branch passes; rejecting them cost the merge benchmarks 1.4 to 3.5% (not fixed)",
		matches: runtimeSays(/merge operand must be an object \(was /)
	},
	{
		kind: "typeChecksButThrows",
		why: "an exponent TypeScript narrows, like 1e-7, is left to a maintainer's decision (d8ec5d53a)",
		matches: (_, o) =>
			/'-?[\d.]+e[+-]?\d+' was parsed as a number/.test(o.runtime) &&
			!/is not assignable|does not exist/.test(o.static)
	},
	{
		kind: "typeErrorButRuns",
		why: "runtime takes the same variadic spread twice as once (tupleLiteral.ts: appendVariadicElement), where TypeScript allows one (not fixed)",
		matches: staticSays(/A tuple may have at most one variadic element/)
	},
	{
		kind: "typeErrorButRuns",
		why: "any absorbs what it's an operand of in TypeScript, where at runtime it's unknown (not fixed)",
		matches: c => isAnyOperand(c)
	},
	{
		kind: "typeErrorButRuns",
		why: "a cycle intersected with never is reduced to never before runtime resolves it (not fixed)",
		matches: (c, o) =>
			/shallow resolution cycle/.test(o.static) && o.runtime === "never"
	},
	{
		kind: "typeErrorButRuns",
		why: "a brand on null or undefined intersects it with an object, which TypeScript reduces to never (not fixed)",
		matches: c => isNullishBrand(c)
	},
	{
		kind: "typeErrorButRuns",
		why: "keyof never is unknown at runtime, which models no prototype keys (keyof.test)",
		matches: c => /keyof\s+never/.test(codeOf(c))
	},
	{
		kind: "typeErrorButRuns",
		why: "a default thunk's return is checked when it's called (defaults.test: checks the returned value)",
		matches: c =>
			/=", \(\) =>/.test(toCode(c.def)) ||
			(c.method === "default" && /\(\) =>/.test(toCode(c.def)))
	},
	{
		kind: "typeErrorButRuns",
		why: "TypeScript can't defer a directly recursive tuple (roundTrip.test)",
		matches: staticSays(/infinitely circular|excessively deep/)
	},
	{
		kind: "typeErrorButRuns",
		why: "ArkRegex rejects an anchor mid-pattern or an unnecessary escape, which JavaScript allows without the u flag (regex/errors.mdx)",
		matches: staticSays(
			/may not appear mid-pattern|is unnecessary and should be removed|must use natural numbers|must be followed by a property|is unsatisfiable$|should be specified with a single backslash/
		)
	},
	{
		kind: "typeErrorButRuns",
		why: "a fluent method is offered by what the Type infers, where runtime accepts a call that changes nothing",
		matches: (c, o) =>
			c.context === "fluent" &&
			/does not exist on type|has no properties in common|is not assignable to parameter/.test(
				o.static
			)
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "a second brand intersects the first's id to never (not fixed)",
		matches: c => /#[^\s#]+[\s)]*#/.test(codeOf(c))
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "required() and partial() of a builtin like Error map the props TypeScript gives it, which runtime doesn't model",
		matches: c =>
			(c.context === "fluent" && /^(?:required|partial)$/.test(c.method!)) ||
			/(?:Required|Partial)\s*</.test(codeOf(c))
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "TypeScript rejects an object sharing no keys with a nested all-optional object type, though it's as much an instance of it",
		matches: (_, o) =>
			/\?:/.test(o.static) && allowedSamplesIn(o).every(isObjectSampleName)
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "a brand on null or undefined intersects it with an object, which TypeScript reduces to never (not fixed)",
		matches: c => isNullishBrand(c)
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "keyof never and keyof a union with an array: runtime models no prototype keys (keyof.test)",
		matches: c => /keyof/.test(codeOf(c))
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "string keywords and literals are all string to TypeScript, and any absorbs what it's intersected with, so Extract and Exclude can't tell apart what runtime does",
		matches: c =>
			/Extract<|Exclude</.test(toCode(c.def)) ||
			(c.context === "fluent" && /extract|exclude/.test(c.method!))
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "whitespace after an optional's '?' is skipped at runtime, where the type doesn't see the '?' (not fixed)",
		matches: c => stringsIn(c.def).some(s => /\?\s+$/.test(s))
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "a morph's output is known to TypeScript, where runtime checks it against what it's piped to once the morph runs, and a structure holding morphs is piped to a type of another kind as a morph at runtime and intersected in its type (not fixed)",
		matches: (c, o) =>
			/\(In: /.test(o.runtime) &&
			(/^(?:to|pipe)$/.test(c.method ?? "") || /\|>/.test(codeOf(c)))
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "a morph intersected with itself is itself, where TypeScript can't tell it from another morph of the same type, so it's never (not fixable)",
		matches: (_, o) => o.static === "never" && /^\(In: /.test(o.runtime)
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "a morph from never makes its key optional in the input, as if it had a default (not fixed)",
		matches: (_, o) => /\(In: never/.test(o.runtime)
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "TypeScript reads an array's element as defined, without noUncheckedIndexedAccess",
		matches: (c, o) =>
			c.context === "fluent" &&
			c.method === "get" &&
			/undefined/.test(o.runtime)
	},
	{
		kind: "runtimeAllowsStaticRejects",
		why: "ArkRegex reads an unanchored pattern ending in a repetition as needing a character after it (not fixed)",
		matches: c => /\/[^/]*[*+]\/|\/[^/]*[*+]\$?\//.test(toCode(c.def))
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "any absorbs what it's an operand of in TypeScript, where at runtime it's unknown (not fixed)",
		matches: c => isAnyOperand(c)
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "a second brand intersects the first's id to never, so the type is unknown (not fixed)",
		matches: c => /#[^\s#]+[\s)]*#/.test(codeOf(c))
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "keyof a string index signature is string | number to TypeScript, which reads a number key as a string, where runtime has string",
		matches: (c, o) =>
			/keyof/.test(codeOf(c)) && /string \| number/.test(o.static)
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "a bound doesn't narrow what TypeScript infers, so number == 5, or a range only 5 is in, is number (range.test: ==)",
		matches: c => /==|[<>]=/.test(codeOf(c))
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "an object's undeclared key behavior isn't in its type",
		matches: c => /"\+": "(?:reject|delete)"/.test(toCode(c.def))
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "string keywords and literals are all string to TypeScript, so Extract and Exclude can't tell them apart",
		matches: c =>
			/Extract<|Exclude</.test(toCode(c.def)) ||
			(c.context === "fluent" && /extract|exclude/.test(c.method!))
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "pick() or omit() leaving no keys infers {}, which TypeScript takes for anything but null or undefined, where runtime has an object; checking for it in their signatures cost the testInstantiations assignability baselines 1.8% (not fixed)",
		matches: (c, o) =>
			c.context === "fluent" &&
			/^(?:pick|omit)$/.test(c.method!) &&
			o.static === "{}"
	},
	{
		kind: "staticAllowsRuntimeRejects",
		why: "a generic's repeated parameter name binds its last arg at runtime and both in its type (not fixed)",
		matches: c => c.context === "generic" && hasRepeatedParam(c)
	}
]

// the names of the samples a runtimeAllowsStaticRejects outcome lists, which
// are separated by spaces outside brackets and quotes
const allowedSamplesIn = (o: Outcome): string[] => {
	const list = o.runtime.slice(o.runtime.lastIndexOf(" allows ") + 8)
	const names: string[] = []
	let depth = 0
	let quoted = false
	let start = 0
	for (let i = 0; i <= list.length; i++) {
		const char = list[i]
		if (char === '"' && list[i - 1] !== "\\") quoted = !quoted
		else if (quoted) continue
		else if (char === "[" || char === "{" || char === "(") depth++
		else if (char === "]" || char === "}" || char === ")") depth--
		else if ((char === " " || char === undefined) && depth === 0) {
			if (i > start) names.push(list.slice(start, i))
			start = i + 1
		}
	}
	return names
}

const isObjectSampleName = (name: string) =>
	/^(?:\[|{|Date\(|RegExp$|function$|Map$|Error$)/.test(name)

// a brand on null or undefined, written with # or as .brand() of one
const isNullishBrand = (c: Case) =>
	stringsIn(c.def).some(s => /(?:null|undefined)[\s)]*#/.test(s)) ||
	(c.method === "brand" &&
		/^(?:null|undefined)$/.test(String((c.def as unknown[])[0])))

// every string a definition is written with, keys included, unescaped
const stringsIn = (def: unknown): string[] =>
	typeof def === "string" ? [def]
	: Array.isArray(def) ? def.flatMap(stringsIn)
	: isCoded(def) || typeof def !== "object" || def === null ? []
	: Object.entries(def).flatMap(([k, v]) => [k, ...stringsIn(v)])

// everything written for a case, generic args and fluent method included
const codeOf = (c: Case) =>
	`${c.method ?? ""}${toCode(c.def)}${c.args ? toCode(c.args) : ""}`

// any in an expression, as a fluent operand or as a generic's constraint, but
// not as an arg to a generic in a string, which is checked as runtime checks it
const isAnyOperand = (c: Case) => {
	const code = codeOf(c)
	return (
		/unknown\.any/.test(code) &&
		(c.context === "generic" ||
			!/[$A-Z_a-z][\w$.]*<[^>]*unknown\.any/.test(code))
	)
}

// a generic's params like "<t, u extends string>" or "<t u>", names only
const hasRepeatedParam = (c: Case) => {
	const params = /<(.*)>/.exec(toCode((c.def as unknown[])[0]))?.[1] ?? ""
	const names = params
		.split(/[\s,]+/)
		.filter(
			(token, i, tokens) => token !== "extends" && tokens[i - 1] !== "extends"
		)
	return new Set(names).size !== names.length
}

const knownFor = (c: Case, o: Outcome) =>
	known.find(k => k.kind === o.kind && k.matches(c, o))

/** definitions one step smaller than def */
const shrink = (def: unknown): unknown[] => {
	if (typeof def === "string") {
		const out = new Set<string>()
		const tokens = def.split(/(\s+|[#%&(),<=>?[\]|])/).filter(Boolean)
		for (let i = 0; i < tokens.length; i++)
			out.add([...tokens.slice(0, i), ...tokens.slice(i + 1)].join(""))
		for (let i = 0; i < def.length; i++)
			out.add(def.slice(0, i) + def.slice(i + 1))
		out.add(def.replace(/\s+/g, " ").trim())
		out.delete(def)
		return [...out]
	}
	if (isCoded(def) || typeof def !== "object" || def === null) return []
	const out: unknown[] = []
	if (Array.isArray(def)) {
		for (let i = 0; i < def.length; i++) {
			out.push([...def.slice(0, i), ...def.slice(i + 1)])
			for (const smaller of shrink(def[i]))
				out.push([...def.slice(0, i), smaller, ...def.slice(i + 1)])
		}
		return out
	}
	const entries = Object.entries(def)
	for (let i = 0; i < entries.length; i++) {
		out.push(
			Object.fromEntries([...entries.slice(0, i), ...entries.slice(i + 1)])
		)
		for (const smaller of shrink(entries[i][1])) {
			const next = [...entries]
			next[i] = [entries[i][0], smaller]
			out.push(Object.fromEntries(next))
		}
	}
	return out
}

const size = (c: Case) => toCode(c.def).length

type Failure = { c: Case; outcome: Outcome }

// the smallest definition each failure is still the same failure for
const minimize = (failures: Failure[], rounds = 6): Failure[] => {
	let current = failures
	for (let round = 0; round < rounds; round++) {
		const candidates: Case[] = []
		const owner = new Map<string, Failure>()
		for (const f of current) {
			const smaller = shrink(f.c.def)
				.map((def, i): Case => ({ ...f.c, id: `${f.c.id}~${round}.${i}`, def }))
				.filter(c => size(c) < size(f.c))
				.sort((l, r) => size(l) - size(r))
				.slice(0, 30)
			for (const c of smaller) {
				candidates.push(c)
				owner.set(c.id, f)
			}
		}
		if (!candidates.length) break
		const evaluated = evaluate(candidates)
		const best = new Map<Failure, Failure>()
		for (const c of candidates) {
			const f = owner.get(c.id)!
			const { outcome } = evaluated.get(c.id)!
			if (
				!outcome ||
				outcome.kind !== f.outcome.kind ||
				outcome.signature !== f.outcome.signature ||
				knownFor(c, outcome)
			)
				continue
			const prior = best.get(f)
			if (!prior || size(c) < size(prior.c)) best.set(f, { c, outcome })
		}
		if (!best.size) break
		current = current.map(f => best.get(f) ?? f)
	}
	return current
}

const describe = ({ c, outcome }: Failure) =>
	[
		`[${outcome.kind}] ${c.context}${c.alias ? `(${c.alias})` : ""}${c.method ? `.${c.method}` : ""}: ${toCode(c.def)}${c.args ? ` (${c.args.map(toCode).join(", ")})` : ""}`,
		`\truntime: ${outcome.runtime.replace(/\n/g, "\\n").slice(0, 300)}`,
		`\tstatic:  ${outcome.static.replace(/\n/g, "\\n").slice(0, 300)}`
	].join("\n")

for (let seed = firstSeed; seed < firstSeed + seeds; seed++) {
	const g = new StructureGen(rngFrom(seed))
	const cases: Case[] = []
	for (let i = 0; i < count; i++) {
		const c = g.case(`${seed}.${i}`)
		if (c) cases.push(c)
	}
	const results = evaluate(cases)
	const counts: Record<string, number> = {}
	const failures: Failure[] = []
	let knownCount = 0
	for (const c of cases) {
		const { outcome } = results.get(c.id)!
		const kind = outcome?.kind ?? "agree"
		counts[kind] = (counts[kind] ?? 0) + 1
		if (!outcome || !acceptanceKinds.has(outcome.kind)) continue
		if (knownFor(c, outcome)) knownCount++
		else failures.push({ c, outcome })
	}
	console.log(
		`seed ${seed}: ${cases.length} definitions, ${counts.agree ?? 0} agreeing, ${knownCount} known asymmetries, ${failures.length} unknown; ${Object.entries(
			counts
		)
			.filter(([kind]) => kind !== "agree")
			.map(([kind, n]) => `${kind} ${n}`)
			.join(", ")}`
	)
	for (const failure of minimize(failures)) {
		console.log(describe(failure))
		process.exitCode = 1
	}
}
