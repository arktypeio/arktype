import { fromHere } from "@ark/fs"
import { $ark } from "@ark/schema"
import { type } from "arktype"
import { keywordDomains } from "arktype/internal/deferred.ts"
import { spawn } from "node:child_process"
import { rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import * as harness from "./harness.ts"

// this process only learns what each definition is, so builds it at its call
$ark.eagerTypes = true

// random programs defining Types and reading them in some order, each run in a
// process building a Type when it's first read and in one building it at its
// call, which must agree on what every definition throws and calls where it's
// written and on what every Type then says, each failure shrunk to a minimal repro

type Expr =
	| { k: "code"; code: string }
	// a string definition
	| { k: "def"; def: string }
	// what an earlier statement defined
	| { k: "ref"; id: number }
	| { k: "object"; entries: [key: string, value: Expr][] }
	| { k: "list"; items: Expr[] }
	| { k: "call"; fn: string; on?: Expr | undefined; args: Expr[] }
	| { k: "get"; on: Expr; name: string }

type Statement =
	| { k: "define"; id: number; expr: Expr }
	| { k: "read"; id: number; first: string }

export interface Program {
	config: string
	statements: Statement[]
	/** values every Type is checked against */
	data: string[]
	/** Types to relate once all are defined */
	pairs: [number, number][]
}

let state = 0

// mulberry32, so a seed gives the same programs on any machine
const random = (n: number): number => {
	state = (state + 0x6d2b79f5) | 0
	let t = Math.imul(state ^ (state >>> 15), 1 | state)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n) | 0
}

const pick = <t>(items: readonly t[]): t => items[random(items.length)]

const chance = (percent: number): boolean => random(100) < percent

const weighted = <t>(options: readonly (readonly [number, t])[]): t => {
	let total = 0
	for (const [weight] of options) total += weight
	let at = random(total)
	for (const [weight, option] of options) {
		if (at < weight) return option
		at -= weight
	}
	return options[0][1]
}

const code = (code: string): Expr => ({ k: "code", code })
const def = (def: string): Expr => ({ k: "def", def })
const list = (...items: Expr[]): Expr => ({ k: "list", items })
const call = (fn: string, args: Expr[], on?: Expr): Expr => ({
	k: "call",
	fn,
	on,
	args
})

// what the scanner proves, and what it must leave to the parser

const pools = {
	scanned: Object.keys(keywordDomains),
	strings: Object.keys(keywordDomains).filter(keyword =>
		keyword.startsWith("string")
	),
	unscanned: [
		"string.trim",
		"string.lower",
		"string.numeric.parse",
		"string.json.parse",
		"string.date.parse",
		"number.epoch",
		"unknown",
		"Date",
		"string.creditCard",
		"string.json",
		"Key",
		"never",
		"this",
		"strin"
	],
	stringLiterals: [
		"'a'",
		"'b'",
		"'c'",
		"''",
		"'a|b'",
		"'a | b'",
		"'a & b'",
		"'a = b'",
		"'a>b'",
		"'a, b'",
		"'it\\'s'",
		'"a"',
		'"b | c"',
		"'1'",
		"'true'",
		"' '",
		"'a\nb'",
		"'[]'",
		"'/a/'",
		"'#'",
		"'string'",
		"'(a)'",
		"'x = 5'",
		"'é'"
	],
	numberLiterals: ["0", "1", "2", "5", "-1", "-5", "0.5", "1.5"],
	// what isn't the number it writes, or isn't one
	oddNumbers: [
		"-0",
		"0.50",
		"01",
		"1e3",
		"1.0",
		".5",
		"5.",
		"+1",
		"9007199254740993",
		"12345678901234567890123",
		"5n",
		"Infinity",
		"NaN"
	],
	regexLiterals: [
		"/a/",
		"/^a+$/",
		"/a|b/",
		"/a | b/",
		"/ & /",
		"/a\\/b/",
		"/[<>]/",
		"/x = 1/",
		"/#/",
		"/'/",
		"/\\d+/",
		"/^[ab]*$/",
		"/(?<n>a)/",
		"/a{/",
		// whose source isn't what's written
		"/[\\/]/",
		"/a\rb/",
		"/a\\rb/"
	],
	oddRegexLiterals: ["/(/", "/a/i", "//", "/[/]/", "/a/ ", "/\\/"],
	brands: ["a", "b1", "_x", "b!c", "1", "a-b", "a!"],
	lengths: ["0", "1", "2", "3", "5"],
	limits: ["0", "1", "2", "3", "5", "-1", "-5", "1.5", "0.5", "-0"],
	oddBounds: ["01", "-0", "1e2", "9007199254740993", "99999999999999999999"],
	dateBounds: ["d'2000-01-01'", "d'2001-01-01'", "d'1999'"],
	stringDefaults: ["'x'", "'a'", "''", "'abcd'"],
	numberDefaults: ["0", "1", "2", "5", "-1"],
	oddDefaults: ["1.5", "-0", "true", "false", "null", "undefined", '"x"', "5n"],
	stringValues: ['"x"', '"a"', '""', '"abcd"'],
	numberValues: ["0", "1", "2", "5", "-1", "-0", "1.5"],
	oddValues: [
		'"it\'s"',
		"\"a' | 'b\"",
		'"a\\\\b"',
		"NaN",
		"Infinity",
		"1e21",
		"1e-7",
		"true",
		"false",
		"null",
		"undefined",
		"1n",
		"sym",
		"unitObject",
		"unitArray"
	],
	thunks: ["f.zero", "f.text", "f.list", "f.box"],
	predicates: ["f.pass", "f.pass", "f.positive", "f.short", "f.hasA", "f.fail"],
	morphs: ["f.toLength", "f.toBox", "f.toText", "f.same"],
	names: ["a", "b", "c", "k", "kind", "x1"],
	// names a key of a definition's nodes must tell apart from what it's written with
	oddNames: [
		"1a",
		"10",
		"0",
		"21",
		"a,1b",
		"a:string",
		"1a:string",
		"a:string,10bbbbbbbbbb",
		"a:string}|{9bbbbbbbbb",
		"bbbbbbbbb",
		"bbbbbbbbbb",
		"a b",
		"a?b",
		"a=b",
		"a|b",
		"{a}",
		"@a",
		"#1",
		"",
		" ",
		"+a",
		"...a",
		"__proto__"
	],
	descriptions: [
		'"x"',
		'"y"',
		'""',
		'"a\\"}"',
		'"x\\"}&/b/"',
		'"a,b"',
		'"a|b"'
	],
	metas: [
		'{ description: "x" }',
		'{ description: "y" }',
		'{ title: "x" }',
		'{ expected: "x" }',
		'{ label: "x" }',
		'{ title: "x", description: "x" }',
		"{}",
		'{ tit: "x" }',
		"{ description: 5 }",
		'{ description: "x", [sym]: 1 }',
		'{ message: () => "x" }'
	],
	undeclared: ["reject", "delete", "ignore", "ignore", "reject", "bad"],
	regexes: [
		"/a/",
		"/b/",
		"/^a+$/",
		"/a|b/",
		"/a/i",
		"/a\\/b/",
		"/(?:)/",
		"/[/]/",
		"/a\\rb/",
		"keyword"
	]
}

// what a program is written with, which is few of each so it writes them twice
let use = pools

const anyValue = (): string =>
	pick(pick([use.stringValues, use.numberValues, use.oddValues, use.oddValues]))

const numberLiteral = () =>
	pick(chance(88) ? use.numberLiterals : use.oddNumbers)

const regexLiteral = () =>
	pick(chance(90) ? use.regexLiterals : use.oddRegexLiterals)

const literal = () =>
	weighted([
		[5, () => pick(use.stringLiterals)],
		[4, numberLiteral],
		[2, () => pick(["true", "false", "null", "undefined"])]
	])()

const bounded = (base: string, isLength: boolean): string => {
	const bound = () =>
		base === "Date" ? pick(use.dateBounds)
		: chance(8) ? pick(use.oddBounds)
		: pick(isLength && chance(92) ? use.lengths : use.limits)
	const comparator = () => (chance(4) ? "==" : pick(["<", "<=", ">", ">="]))
	const below = () => pick(["<", "<="])
	let [lower, upper] = [bound(), bound()]
	// mostly not empty, and sometimes of one value
	if (+lower > +upper && chance(85)) [lower, upper] = [upper, lower]
	if (chance(10)) upper = lower
	return weighted([
		[6, () => `${base} ${comparator()} ${bound()}`],
		[5, () => `${lower} ${below()} ${base} ${below()} ${upper}`],
		[1, () => `${lower} ${comparator()} ${base} ${comparator()} ${upper}`],
		[1, () => `${bound()} ${comparator()} ${base}`]
	])()
}

const stringish = (): string =>
	weighted([
		[5, () => "string"],
		[3, () => pick(use.strings)],
		[5, () => bounded("string", true)],
		[2, () => `string#${pick(use.brands)}`]
	])()

const numberish = (): string =>
	weighted([
		[5, () => "number"],
		[3, () => "number.integer"],
		[1, () => "number.safe"],
		[5, () => bounded(pick(["number", "number.integer"]), false)],
		[1, () => `${pick(["number", "number.integer"])} % ${pick(use.limits)}`]
	])()

const objectish = (depth: number): string =>
	weighted([
		[6, () => `${term(depth + 1)}[]`],
		[4, () => bounded(`${term(depth + 1)}[]`, true)],
		[1, () => "object"],
		[
			depth < 2 ? 3 : 0,
			() =>
				`Record<${pick(["string", "string", "symbol", "string.uuid", "'a'", "number"])}${pick([", ", ", ", ","])}${union(depth + 1)}>`
		]
	])()

const term = (depth: number): string =>
	weighted([
		[12, () => pick(use.scanned)],
		[14, stringish],
		[12, numberish],
		[12, () => objectish(depth)],
		[20, literal],
		[4, () => pick(use.unscanned)],
		[3, regexLiteral],
		[depth < 2 ? 5 : 0, () => `(${union(depth + 1)})`],
		[3, () => `${pick(use.scanned)}#${pick(use.brands)}`],
		[1, () => bounded(pick(["Date", pick(use.scanned)]), false)]
	])()

const union = (depth: number): string => {
	const terms = weighted([
		[50, () => [term(depth)]],
		// what a union is scanned for: terms that can't overlap
		[22, () => disjoint(depth)],
		[
			18,
			() =>
				chance(92) ? literals() : Array.from({ length: 2 + random(3) }, literal)
		],
		[10, () => Array.from({ length: 2 + random(2) }, () => term(depth))]
	])()
	return terms.join(chance(96) ? " | " : pick(["|", "  |  ", " |", "| "]))
}

// what refines a string, which an intersection of them is scanned for
const refinement = (): string =>
	weighted([
		[5, regexLiteral],
		[3, () => bounded("string", true)],
		[3, () => pick(use.strings)],
		[1, () => term(2)]
	])()

const mutated = (s: string): string => {
	const at = random(s.length + 1)
	const inserted = pick([" ", "  ", "\t", "|", "&", "<", ">", "=", "#", "[]"])
	return weighted([
		[3, () => `${s.slice(0, at)}${inserted}${s.slice(at)}`],
		[2, () => `${s.slice(0, at)}${s.slice(at + 1)}`],
		[1, () => ` ${s}`],
		[1, () => `${s} `],
		[2, () => s.replace(" ", "")],
		[2, () => s.replace(" ", "  ")]
	])()
}

const defaultFor = (s: string): string =>
	pick(
		chance(20) ? pick([use.stringDefaults, use.numberDefaults, use.oddDefaults])
		: /^(string|\/|')/.test(s) ? use.stringDefaults
		: /^(number|-?\d)/.test(s) ? use.numberDefaults
		: /^(boolean|true|false)/.test(s) ? ["true", "false"]
		: use.oddDefaults
	)

const disjoint = (depth: number): string[] =>
	shuffled([
		stringish,
		numberish,
		() => objectish(depth),
		() => "boolean",
		() => "null",
		() => "undefined",
		() => pick(["bigint", "symbol"])
	])
		.slice(0, 2 + random(2))
		.map(create => create())

const literals = (): string[] => [
	...new Set(Array.from({ length: 2 + random(3) }, literal))
]

// mostly what's scanned, so what holds it defers
const scannable = (): string =>
	weighted([
		[22, stringish],
		[18, numberish],
		[10, () => objectish(1)],
		[10, () => pick(use.scanned)],
		[8, literal],
		[12, () => literals().join(" | ")],
		[12, () => disjoint(1).join(" | ")],
		[
			5,
			() =>
				`${stringish()} & ${chance(60) ? regexLiteral() : pick(use.strings)}`
		],
		[2, () => "string.trim"],
		[2, () => `string.trim |> ${stringish()}`]
	])()

const stringDef = (isProp: boolean): string => {
	if (chance(55)) {
		const s = scannable()
		return isProp && chance(14) ? `${s} = ${defaultFor(s)}` : s
	}
	let s = weighted([
		[60, () => union(0)],
		[
			12,
			() =>
				`${chance(85) ? stringish() : term(1)}${chance(95) ? " & " : "&"}${refinement()}`
		],
		[5, () => `string.trim |> ${chance(80) ? refinement() : union(1)}`],
		[1, () => `${term(1)} |> ${term(1)}`]
	])()
	if (isProp && chance(14)) s += ` = ${defaultFor(s)}`
	else if (isProp && chance(2)) s += "?"
	return chance(3) ? mutated(s) : s
}

type Sort =
	| "string"
	| "number"
	| "object"
	| "array"
	| "unit"
	| "any"
	// what only a property can be
	| "prop"
	// what threw, so nothing can hold it
	| "none"

interface Made {
	id: number
	sort: Sort
	expr: Expr
}

let made: Made[] = []

const refTo = (isProp: boolean): Expr | undefined => {
	const candidates = made.filter(
		m => m.sort !== "none" && (isProp || m.sort !== "prop")
	)
	return candidates.length ? { k: "ref", id: pick(candidates).id } : undefined
}

const regex = (): Expr => code(pick(use.regexes))

const key = (): string =>
	JSON.stringify(
		weighted([
			[62, () => pick(use.names)],
			[14, () => `${pick(use.names)}?`],
			[1, () => `${pick(use.names)}\\?`],
			[9, () => pick(use.oddNames)],
			[2, () => `${pick(use.oddNames)}?`],
			[
				2,
				() =>
					`[${pick(["string", "symbol", "/^a/", "string.uuid", "'a'", "number", "string | symbol"])}]`
			],
			[1, () => pick(["[string]?", "\\[string]", "\\+", "\\...", "\\@"])]
		])()
	)

const propValue = (depth: number): Expr =>
	weighted([
		[50, () => def(stringDef(true))],
		[depth < 2 ? 9 : 0, () => objectLiteral(depth + 1)],
		[5, () => list(propValue(depth + 1), def("[]"))],
		[4, () => list(propValue(depth + 1), def("?"))],
		[
			6,
			() => {
				const s =
					chance(85) ? pick([stringish, numberish, literal])() : union(0)
				return list(
					def(s),
					def("="),
					code(
						chance(30) ? pick(use.thunks)
						: chance(20) ? anyValue()
						: pick(
								/^(string|')/.test(s) ? use.stringValues
								: /^(number|-?\d)/.test(s) ? use.numberValues
								: use.oddValues
							)
					)
				)
			}
		],
		[1, () => list(propValue(depth + 1), def("="), code(pick(use.thunks)))],
		[
			1,
			() =>
				pick([
					list(),
					list(def("string"), def("[]"), def("x")),
					list(def("string"), def("|"), def("number")),
					list(def("string"), def("="))
				])
		],
		[14, () => refTo(true) ?? def(stringDef(true))],
		[3, regex],
		[2, () => def(pick(["this", "this[]", "this | string"]))],
		[
			1,
			() =>
				code(pick(["5", "null", "undefined", "true", "f.box", "Date", "sym"]))
		]
	])()

const objectLiteral = (depth: number): Expr => {
	const entries: [string, Expr][] = []
	const count = weighted([
		[3, 0],
		[35, 1],
		[35, 2],
		[20, 3],
		[7, 4]
	])
	for (let i = 0; i < count; i++) entries.push([key(), propValue(depth)])
	if (chance(12)) {
		const entry: [string, Expr] = ['"+"', def(pick(use.undeclared))]
		if (chance(60)) entries.push(entry)
		else entries.unshift(entry)
	}
	if (chance(10)) {
		const spread: [string, Expr] = [
			'"..."',
			weighted([
				[6, () => refTo(false) ?? objectLiteral(depth + 1)],
				[3, () => call("type", [objectLiteral(depth + 1)])],
				[1, () => def(stringDef(false))]
			])()
		]
		if (chance(90)) entries.unshift(spread)
		else entries.push(spread)
	}
	if (chance(2)) entries.push(['"@"', code(pick(use.descriptions))])
	if (chance(1)) entries.push(["sym", def("string")])
	return { k: "object", entries }
}

const definition = (): Expr =>
	weighted([
		[45, () => def(stringDef(false))],
		[25, () => objectLiteral(0)],
		[15, () => refTo(false) ?? def(stringDef(false))],
		[5, regex],
		[4, () => list(definition(), def("[]"))],
		[3, () => list(definition(), def("|"), definition())],
		[1, () => code(pick(["5", "null", "undefined", "Date", "f.box"]))]
	])()

// what's scanned as a string, which defers only until a node exists
const stringCreator = (): Expr =>
	weighted([
		[60, () => call("type", [def(stringDef(false))])],
		[10, () => call("type.unit", [code(anyValue())])],
		[
			8,
			() =>
				call(
					"type.enumerated",
					Array.from({ length: 1 + random(3) }, () => code(anyValue()))
				)
		],
		[
			10,
			() =>
				call(
					"type.or",
					Array.from({ length: 2 + random(2) }, () => def(stringDef(false)))
				)
		],
		[
			6,
			() =>
				code(`type.${pick(["string", "number", "boolean", "null", "object"])}`)
		],
		[6, () => call("type.Record", [def("string"), def(stringDef(false))])]
	])()

const creator = (): Expr =>
	weighted([
		[30, () => call("type", [def(stringDef(false))])],
		[32, () => call("type", [objectLiteral(0)])],
		[3, () => call("type", [regex()])],
		[5, () => call("type.raw", [def(stringDef(false))])],
		[2, () => call("type.raw", [objectLiteral(0)])],
		[5, () => call("type.unit", [code(anyValue())])],
		[
			4,
			() =>
				call(
					"type.enumerated",
					Array.from({ length: random(4) }, () => code(anyValue()))
				)
		],
		[
			8,
			() => call("type.or", Array.from({ length: 1 + random(3) }, definition))
		],
		// branches of one kind, which a union reduces and an intersection can conflict with
		[
			6,
			() => {
				const branch = pick<() => Expr>([
					() => def(chance(60) ? bounded("string", true) : refinement()),
					() => def(numberish()),
					() => objectLiteral(1)
				])
				return call("type.or", Array.from({ length: 2 + random(2) }, branch))
			}
		],
		[
			5,
			() =>
				call("type.Record", [
					weighted([
						[6, () => def(pick(["string", "string", "symbol", "string.uuid"]))],
						[2, () => def(stringDef(false))],
						[2, () => refTo(false) ?? def("string")]
					])(),
					definition()
				])
		],
		[
			3,
			() =>
				code(`type.${pick(["string", "number", "boolean", "null", "object"])}`)
		],
		[
			2,
			() =>
				code(
					pick([
						'alias("cyclic", "user")',
						'alias("cyclic", "tree")',
						'alias("cyclic", "trimmed")',
						'alias("cyclic", "pos")',
						'alias("shadow", "string")',
						'alias("shadow", "boolean")',
						'alias("strict", "o")'
					])
				)
		],
		[
			2,
			() =>
				call("sc", [
					code(JSON.stringify(pick(["shadow", "strict", "cyclic"]))),
					definition()
				])
		]
	])()

interface Step {
	fn: string
	args: Expr[]
	get?: true
}

// the literals a definition is written with, which excluding one leaves the rest of
const literalsIn = (e: Expr, found: string[] = []): string[] => {
	if (e.k === "def") {
		for (const part of e.def.split(" | ")) {
			if (/^('[^'\\]*'|-?\d+(\.\d+)?|true|false|null|undefined)$/.test(part))
				found.push(part)
		}
	} else if (e.k === "code" && /^("[^"'\\]*"|-?\d+)$/.test(e.code))
		found.push(e.code.replace(/"/g, "'"))
	else if (e.k === "list") for (const item of e.items) literalsIn(item, found)
	else if (e.k === "call") {
		if (e.on) literalsIn(e.on, found)
		for (const arg of e.args) literalsIn(arg, found)
	} else if (e.k === "get") literalsIn(e.on, found)
	return found
}

const step = (sort: Sort, on: Expr): Step => {
	const isString = sort === "string"
	const isNumber = sort === "number"
	const isObject = sort === "object"
	const sized = isString || sort === "array"
	const bound = (isLength: boolean): Expr[] => {
		const n = code(
			chance(8) ?
				pick(["NaN", "Infinity", '"1"', "9007199254740993"])
			:	pick(isLength && chance(90) ? use.lengths : use.limits)
		)
		return chance(6) ? [n, code('"m"')] : [n]
	}
	const withSelector = (args: Expr[]): Expr[] =>
		chance(8) ? [...args, code(pick(['"self"', '"shallow"']))] : args
	return weighted<() => Step>([
		[8, () => ({ fn: "array", args: [] })],
		[8, () => ({ fn: "narrow", args: [code(pick(use.predicates))] })],
		[
			6,
			() => ({
				fn: "pipe",
				args: Array.from({ length: 1 + random(2) }, () =>
					code(pick(use.morphs))
				)
			})
		],
		[1, () => ({ fn: "pipe.try", args: [code(pick(use.morphs))] })],
		[9, () => ({ fn: "or", args: [definition()] })],
		[
			isString ? 16
			: isObject ? 12
			: 3,
			() => ({
				fn: "and",
				args: [
					isString ?
						weighted([
							[5, regex],
							[4, () => def(refinement())],
							[1, definition]
						])()
					: isObject && chance(80) ? objectLiteral(1)
					: definition()
				]
			})
		],
		[
			sort === "unit" || sort === "any" ? 8 : 1,
			() => ({
				fn: "exclude",
				args: [
					def(
						chance(85) ?
							[
								...new Set(
									Array.from({ length: 1 + random(2) }, () => {
										const held = literalsIn(on)
										return held.length && chance(80) ? pick(held) : literal()
									})
								)
							].join(" | ")
						:	union(1)
					)
				]
			})
		],
		[
			isString || sort === "any" ? 4 : 1,
			() => ({
				fn: "to",
				args: [chance(70) ? def(refinement()) : definition()]
			})
		],
		[
			4,
			() => ({
				fn: "default",
				args: [
					code(
						chance(25) ? pick(use.thunks)
						: chance(75) && isString ? pick(use.stringValues)
						: chance(75) && isNumber ? pick(use.numberValues)
						: anyValue()
					)
				]
			})
		],
		[2, () => ({ fn: "optional", args: [] })],
		[
			isString ? 10 : 7,
			() => ({
				fn: "describe",
				args: withSelector([code(pick(use.descriptions))])
			})
		],
		[
			5,
			() => ({ fn: "configure", args: withSelector([code(pick(use.metas))]) })
		],
		[
			isObject || sort === "array" || sort === "any" ? 9 : 1,
			() => ({
				fn: "onUndeclaredKey",
				args: [code(JSON.stringify(pick(use.undeclared)))]
			})
		],
		[
			isNumber ? 10 : 1,
			() => ({ fn: pick(["atLeast", "atMost"]), args: bound(false) })
		],
		[
			sized ? 10 : 1,
			() => ({
				fn: pick(["atLeastLength", "atMostLength"]),
				args: bound(true)
			})
		],
		// what never defers, so what it's chained to is read
		[
			isNumber ? 3 : 0,
			() => ({
				fn: pick(["moreThan", "lessThan", "divisibleBy"]),
				args: bound(false)
			})
		],
		[
			sized ? 3 : 0,
			() => ({
				fn: pick(["moreThanLength", "lessThanLength", "exactlyLength"]),
				args: bound(true)
			})
		],
		[
			isObject ? 4 : 0,
			() =>
				pick<Step>([
					{ fn: "partial", args: [] },
					{ fn: "required", args: [] },
					{ fn: "keyof", args: [] },
					{ fn: "pick", args: [code('"a"')] },
					{ fn: "omit", args: [code('"a"')] },
					{ fn: "merge", args: [objectLiteral(1)] }
				])
		],
		[1, () => ({ fn: "brand", args: [code('"b"')] })],
		[1, () => ({ fn: pick(["in", "out"]), args: [], get: true })]
	])()
}

const applied = (on: Expr, s: Step): Expr =>
	s.get ? { k: "get", on, name: s.fn } : call(s.fn, s.args, on)

// the same definition written again, or nearly
const respelled = (e: Expr): Expr =>
	e.k === "def" ? def(e.def.split(" | ").reverse().join(" | "))
	: e.k === "object" ?
		{
			k: "object",
			entries: (chance(70) ? e.entries : [...e.entries].reverse()).map(
				([k, v]) => [k, respelled(v)]
			)
		}
	: e.k === "list" ? list(...e.items.map(respelled))
	: e.k === "call" ?
		{
			...e,
			on: e.on && respelled(e.on),
			args: (e.fn === "type.or" && chance(50) ?
				[...e.args].reverse()
			:	e.args
			).map(respelled)
		}
	: e.k === "get" ? { ...e, on: respelled(e.on) }
	: e

const firstReads = [
	"expression",
	"expression",
	"description",
	"json",
	"call",
	"allows",
	"assert",
	"in",
	"equals",
	"keys"
]

const fixedData = [
	"undefined",
	"null",
	"true",
	"false",
	"0",
	"-0",
	"1",
	"2",
	"3",
	"5",
	"6",
	"-1",
	"1.5",
	"NaN",
	"Infinity",
	'""',
	'"a"',
	'"b"',
	'"ab"',
	'"abc"',
	'"abcd"',
	'" a "',
	'"5"',
	'"x"',
	'"a|b"',
	"1n",
	"sym",
	"[]",
	'["a"]',
	'["a", "b"]',
	'["a", "b", "c"]',
	"[1, 2, 3]",
	"{}",
	'{ a: "a" }',
	"{ a: 1 }",
	'{ a: "a", b: 1 }',
	'{ a: "a", zz: 1 }',
	'{ a: " a " }',
	'{ k: "a" }',
	'{ a: { a: "a" } }',
	"{ a: undefined }",
	"unitObject",
	"unitArray",
	"new Date(0)"
]

const sampleOf = (s: string): string => {
	const quoted = /'([^']*)'/.exec(s)
	return (
		s.endsWith("[]") ? `[${sampleOf(s.slice(0, -2))}]`
		: quoted && chance(70) ? JSON.stringify(quoted[1])
		: /^-?\d+(\.\d+)?$/.test(s) ? s
		: /string|^\//.test(s) ? pick(['"a"', '"abc"', '" a "', '"abcd"'])
		: /number/.test(s) ? pick(["0", "1", "3", "5", "1.5"])
		: /boolean|true/.test(s) ? "true"
		: pick(fixedData)
	)
}

// the name a key defines a prop by, if it does
const propNameOf = (key: string): string | undefined => {
	if (key[0] !== '"') return
	const name: string = JSON.parse(key)
	return (
		/^(\[.*]\??|\+|\.{3}|@)$/.test(name) ? undefined
		: name.endsWith("\\?") ? `${name.slice(0, -2)}?`
		: name.endsWith("?") ? name.slice(0, -1)
		: name
	)
}

// data shaped like an object literal, so some of it is allowed
const sample = (e: Expr): string => {
	if (e.k === "def") return sampleOf(e.def)
	if (e.k === "list") {
		return e.items[1]?.k === "def" && e.items[1].def === "[]" ?
				`[${sample(e.items[0])}]`
			:	sample(e.items[0] ?? code("1"))
	}
	if (e.k !== "object") return pick(fixedData)
	const props: string[] = []
	for (const [k, v] of e.entries) {
		const name = propNameOf(k)
		if (name !== undefined && chance(85))
			props.push(`[${JSON.stringify(name)}]: ${sample(v)}`)
	}
	if (chance(15)) props.push("zz: 1")
	return `{ ${props.join(", ")} }`
}

const literalsOf = (e: Expr, found: Expr[] = []): Expr[] => {
	if (e.k === "object") {
		found.push(e)
		for (const [, v] of e.entries) literalsOf(v, found)
	} else if (e.k === "list") for (const item of e.items) literalsOf(item, found)
	else if (e.k === "call") {
		if (e.on) literalsOf(e.on, found)
		for (const arg of e.args) literalsOf(arg, found)
	} else if (e.k === "get") literalsOf(e.on, found)
	return found
}

const shuffled = <t>(items: t[]): t[] => {
	const result = [...items]
	for (let i = result.length - 1; i > 0; i--) {
		const j = random(i + 1)
		;[result[i], result[j]] = [result[j], result[i]]
	}
	return result
}

const stringType = type.raw("string")
const numberType = type.raw("number")
const arrayType = type.raw("unknown[]")
const objectType = type.raw("object")

// what a definition is as its program reaches it, which says what more to write
// of it: this process defines each as it's generated
const sortOf = (id: number, expr: Expr): Sort => {
	const scope = { ...harness }
	const create = new Function(
		...Object.keys(scope),
		`return (${render(expr)})`
	).bind(undefined, ...Object.values(scope))
	if (!harness.define(id, create)) return "none"
	const result = harness.ref(id)
	if (typeof result !== "function") return "prop"
	const t = result as type.Any
	try {
		return (
			t.internal.branches.every(branch => branch.is("unit")) ? "unit"
			: t.extends(stringType) ? "string"
			: t.extends(numberType) ? "number"
			: t.extends(arrayType) ? "array"
			: t.extends(objectType) ? "object"
			: "any"
		)
	} catch {
		return "any"
	}
}

export const generate = (seed: number, index: number): Program => {
	state = Math.imul(seed, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b)
	made = []
	harness.reset()
	use = pools
	if (chance(60)) {
		use = { ...pools }
		for (const k of Object.keys(pools) as (keyof typeof pools)[])
			use[k] = shuffled(pools[k]).slice(0, 2 + random(3))
	}
	const config = weighted([
		[70, ""],
		[10, "{ jitless: true }"],
		[10, "{ exactOptionalPropertyTypes: false }"],
		[7, "{ jitless: true, exactOptionalPropertyTypes: false }"],
		[3, '{ onUndeclaredKey: "delete" }']
	])
	// a long program is many short ones sharing what a process keeps
	const count = weighted([
		[15, () => 1 + random(2)],
		[35, () => 3 + random(6)],
		[30, () => 9 + random(12)],
		[20, () => 30 + random(70)]
	])()
	// when each Type is first read: once all are defined, in some order, as
	// it's defined, or between others
	const order = pick([
		"after",
		"after",
		"reversed",
		"shuffled",
		"eager",
		"mixed"
	])
	// how many definitions come before any other could build a node
	let prelude = chance(45) ? 1 + random(6) : 0
	const statements: Statement[] = []
	const unread: number[] = []
	const readOne = (id: number) =>
		statements.push({ k: "read", id, first: pick(firstReads) })
	// most of what throws is left out, so most of a program is what it can build on
	const define = (expr: Expr): Sort => {
		const id = made.length
		const sort = sortOf(id, expr)
		if (sort === "none" && chance(75)) return sort
		made.push({ id, sort, expr })
		statements.push({ k: "define", id, expr })
		if (sort === "none" || sort === "prop") return sort
		if (order === "eager" && prelude <= 0) readOne(id)
		else unread.push(id)
		if (order === "mixed" && prelude <= 0 && chance(40))
			readOne(unread.splice(random(unread.length), 1)[0])
		return sort
	}
	for (let tries = 0; made.length < count && tries < count * 6; tries++) {
		prelude--
		const from = made.filter(m => m.sort !== "none")
		// defined again, or nearly
		if (from.length && chance(12)) {
			const again = pick(from)
			define(chance(50) ? again.expr : respelled(again.expr))
			continue
		}
		const types = from.filter(m => m.sort !== "prop")
		const base: Expr =
			types.length && chance(30) ? { k: "ref", id: pick(types).id }
			: prelude >= 0 ? stringCreator()
			: creator()
		// a chain as one statement, so nothing reads what it's chained to
		const steps: Step[] = []
		let sort = sortOf(-1, base)
		const length = weighted([
			[45, 0],
			[25, 1],
			[15, 2],
			[10, 3],
			[5, 4]
		])
		let expr = base
		for (let i = 0; i < length && sort !== "none" && sort !== "prop"; i++) {
			const next = step(sort, expr)
			steps.push(next)
			expr = applied(expr, next)
			sort = sortOf(-1, expr)
		}
		if (base.k === "ref" && !steps.length) continue
		define(expr)
		// the same chain in another order, which is another Type or the same one
		if (steps.length > 1 && chance(40))
			define(shuffled(steps).reduce(applied, base))
	}
	for (const id of order === "reversed" ? unread.reverse()
	: order === "after" ? unread
	: shuffled(unread))
		readOne(id)
	const data = [...fixedData]
	for (const literal of shuffled(made.flatMap(m => literalsOf(m.expr))).slice(
		0,
		8
	)) {
		data.push(sample(literal))
		data.push(sample(literal))
	}
	const pairs: [number, number][] = []
	for (let i = 0; i < 8 && made.length > 1; i++)
		pairs.push([random(made.length), random(made.length)])
	return { config, statements, data, pairs }
}

const render = (e: Expr): string =>
	e.k === "code" ? e.code
	: e.k === "def" ? JSON.stringify(e.def)
	: e.k === "ref" ? `ref(${e.id})`
	: e.k === "object" ?
		`{ ${e.entries.map(([k, v]) => `[${k}]: ${render(v)}`).join(", ")} }`
	: e.k === "list" ? `[${e.items.map(render).join(", ")}]`
	: e.k === "get" ? `${render(e.on)}.${e.name}`
	: `${e.on ? `${render(e.on)}.` : ""}${e.fn}(${e.args.map(render).join(", ")})`

const harnessUrl = pathToFileURL(fromHere("harness.ts")).href

/** the module a process runs */
export const source = (program: Program): string =>
	[
		`import { alias, check, configure, define, f, keyword, read, ref, relate, sc, sym, type, unitArray, unitObject } from ${JSON.stringify(harnessUrl)}`,
		program.config && `configure(${program.config})`,
		`check([\n${program.data.map(datum => `\t() => (${datum})`).join(",\n")}\n])`,
		...program.statements.map(s =>
			s.k === "define" ?
				`define(${s.id}, () => (${render(s.expr)}))`
			:	`read(${s.id}, ${JSON.stringify(s.first)})`
		),
		`relate(${JSON.stringify(program.pairs)})`
	]
		.filter(Boolean)
		.join("\n")

const cacheDir = join(tmpdir(), "arktypeDeferredFuzz")

const run = (module: string, eager: boolean): Promise<string> =>
	new Promise(resolve => {
		const { ARK_FUZZ_EAGER: _, ...env } = process.env
		const child = spawn(
			process.execPath,
			["--conditions", "ark-ts", "--input-type=module", "-"],
			{
				cwd: fromHere("..", ".."),
				env: {
					...env,
					NODE_COMPILE_CACHE: cacheDir,
					...(eager ? { ARK_FUZZ_EAGER: "1" } : {})
				},
				timeout: 120000
			}
		)
		let out = ""
		let err = ""
		// decoded as one stream, so a character split between chunks is read whole
		child.stdout.setEncoding("utf8").on("data", chunk => (out += chunk))
		child.stderr.setEncoding("utf8").on("data", chunk => (err += chunk))
		child.on("close", status =>
			resolve(
				status === 0 ? out : (
					JSON.stringify([
						{
							crashed:
								err.split("\n").find(line => /Error|error/.test(line)) ??
								`exit ${status}`
						}
					])
				)
			)
		)
		child.stdin.end(module)
	})

export interface Mismatch {
	/** where the processes' events first differ */
	at: string
	deferred: string
	eager: string
}

// a reference registered without a name is numbered as it's registered, as is
// each alias the name of another is written with
const unnumbered = (events: string) =>
	events.replace(/\$ark\.[^\s"(),\\\]}]+/g, name => name.replace(/\$?\d+/g, ""))

let comparisons = 0

// what each is written with, in any order
const written = (said: unknown) =>
	typeof said === "string" ? [...said].sort().join("") : said

const differing = (
	deferred: unknown,
	eager: unknown,
	at: string,
	unordered = false
): Mismatch | undefined => {
	if (
		typeof deferred === "object" &&
		deferred &&
		typeof eager === "object" &&
		eager
	) {
		// what holds an alias says the same in an order of its own
		const within =
			unordered || ("aliased" in deferred && deferred.aliased === true)
		for (const k of new Set([
			...Object.keys(deferred),
			...Object.keys(eager)
		])) {
			// a Type is unread only where it's built when it's read
			if (k === "unread") continue
			const found = differing(
				(deferred as any)[k],
				(eager as any)[k],
				`${at}.${k}`,
				within
			)
			if (found) return found
		}
		return
	}
	comparisons++
	if (
		deferred !== eager &&
		!(unordered && written(deferred) === written(eager))
	)
		return { at, deferred: `${deferred}`, eager: `${eager}` }
}

interface Ran {
	mismatch: Mismatch | undefined
	events: { unread?: boolean; threw?: string; read?: object }[]
}

const compare = async (program: Program): Promise<Ran> => {
	const module = source(program)
	const [deferred, eager] = await Promise.all([
		run(module, false),
		run(module, true)
	])
	const events = JSON.parse(unnumbered(deferred))
	return {
		mismatch: differing(events, JSON.parse(unnumbered(eager)), ""),
		events
	}
}

// what differs, whichever statement and value it's at
const kindOf = (mismatch: Mismatch) => mismatch.at.replace(/\.\d+/g, "")

// each smaller expression that might still fail
const reductions = (e: Expr): Expr[] => {
	const within = (
		children: Expr[],
		rebuilt: (children: Expr[]) => Expr
	): Expr[] =>
		children.flatMap((child, i) =>
			reductions(child).map(reduced =>
				rebuilt(children.map((c, j) => (i === j ? reduced : c)))
			)
		)
	if (e.k === "def") {
		const parts = e.def.split(" | ")
		return [
			...(parts.length > 1 ?
				parts.map((_, i) => def(parts.filter((_, j) => i !== j).join(" | ")))
			:	[]),
			...(e.def.length > 6 && e.def !== "string" ? [def("string")] : [])
		]
	}
	if (e.k === "object") {
		return [
			...e.entries.map(
				(_, i): Expr => ({
					k: "object",
					entries: e.entries.filter((_, j) => i !== j)
				})
			),
			...within(
				e.entries.map(([, v]) => v),
				values => ({
					k: "object",
					entries: e.entries.map(([k], i) => [k, values[i]])
				})
			)
		]
	}
	if (e.k === "list")
		return [...e.items, ...within(e.items, items => ({ k: "list", items }))]

	if (e.k === "get")
		return [e.on, ...reductions(e.on).map(on => ({ ...e, on }))]
	if (e.k === "call") {
		return [
			...(e.on ? [e.on, ...reductions(e.on).map(on => ({ ...e, on }))] : []),
			...(e.fn === "type.or" || e.fn === "type.enumerated" ?
				e.args.map(
					(_, i): Expr => ({ ...e, args: e.args.filter((_, j) => i !== j) })
				)
			:	[]),
			...within(e.args, args => ({ ...e, args }))
		]
	}
	return []
}

const refsOf = (e: Expr): number[] =>
	e.k === "ref" ? [e.id]
	: e.k === "object" ? e.entries.flatMap(([, v]) => refsOf(v))
	: e.k === "list" ? e.items.flatMap(refsOf)
	: e.k === "get" ? refsOf(e.on)
	: e.k === "call" ? [...(e.on ? refsOf(e.on) : []), ...e.args.flatMap(refsOf)]
	: []

// without a statement, and what it's then no use to keep
const without = (program: Program, at: number): Program => {
	const removed = program.statements[at]
	let statements = program.statements.filter((_, i) => i !== at)
	if (removed.k === "define") {
		const gone = new Set([removed.id])
		statements = statements.filter(s => {
			if (s.k === "read") return !gone.has(s.id)
			if (!refsOf(s.expr).some(id => gone.has(id))) return true
			gone.add(s.id)
			return false
		})
	}
	return { ...program, statements }
}

const maxTrials = 250

/** the smallest program found that still differs the same way */
export const shrink = async (
	program: Program,
	mismatch: Mismatch
): Promise<[Program, Mismatch]> => {
	const kind = kindOf(mismatch)
	let trials = 0
	const attempt = async (candidate: Program): Promise<boolean> => {
		if (trials++ > maxTrials) return false
		const found = (await compare(candidate)).mismatch
		if (!found || kindOf(found) !== kind) return false
		program = candidate
		mismatch = found
		return true
	}
	await attempt({ ...program, pairs: [] })
	let changed = true
	while (changed && trials <= maxTrials) {
		changed = false
		for (let i = program.statements.length - 1; i >= 0; i--) {
			if (i < program.statements.length && (await attempt(without(program, i))))
				changed = true
		}
		for (let i = 0; i < program.statements.length; i++) {
			const s = program.statements[i]
			if (s.k !== "define") continue
			for (const expr of reductions(s.expr)) {
				const statements = program.statements.map((other, j) =>
					i === j ? { ...s, expr } : other
				)
				if (await attempt({ ...program, statements })) {
					changed = true
					break
				}
			}
		}
	}
	// the value it differs at, if it's at one
	const datum = /\.(?:cold|warm)\.(\d+)$/.exec(mismatch.at)
	await (datum ?
		attempt({ ...program, data: [program.data[+datum[1]]] })
	:	attempt({ ...program, data: [] }))
	return [program, mismatch]
}

export interface Failure {
	seed: number
	index: number
	mismatch: Mismatch
	/** the module of the smallest program that still differs */
	repro: string
}

export interface FuzzResult {
	programs: number
	/** definitions that didn't throw, and how many of them weren't built at their call */
	defined: number
	unread: number
	threw: number
	read: number
	comparisons: number
	failures: Failure[]
}

export const fuzz = async (
	seed: number,
	programs: number,
	jobs = 4
): Promise<FuzzResult> => {
	const result: FuzzResult = {
		programs,
		defined: 0,
		unread: 0,
		threw: 0,
		read: 0,
		comparisons: 0,
		failures: []
	}
	comparisons = 0
	const failed: [number, Program, Mismatch][] = []
	let next = 0
	const worker = async () => {
		while (next < programs) {
			const index = next++
			const program = generate(seed, index)
			const { mismatch, events } = await compare(program)
			for (const event of events) {
				if (event.threw !== undefined) result.threw++
				else if (event.unread !== undefined) {
					result.defined++
					if (event.unread) result.unread++
				} else if (event.read) result.read++
			}
			if (mismatch) failed.push([index, program, mismatch])
		}
	}
	await Promise.all(Array.from({ length: jobs }, worker))
	result.comparisons = comparisons
	// one of each way of differing, since shrinking one runs it many times over
	const kinds = new Set<string>()
	for (const [index, program, mismatch] of failed.sort((l, r) => l[0] - r[0])) {
		const kind = kindOf(mismatch)
		if (kinds.has(kind)) {
			result.failures.push({ seed, index, mismatch, repro: "" })
			continue
		}
		kinds.add(kind)
		const [shrunk, found] = await shrink(program, mismatch)
		result.failures.push({
			seed,
			index,
			mismatch: found,
			repro: source(shrunk)
		})
	}
	rmSync(cacheDir, { recursive: true, force: true })
	return result
}
