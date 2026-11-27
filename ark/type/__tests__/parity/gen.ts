import {
	coded,
	ctorDate,
	ctorMap,
	fnMorph,
	fnNarrow,
	fnThunk,
	mod,
	modRoot,
	sym,
	typeValue,
	type Case
} from "./harness.ts"

// definitions in ArkType's syntax, valid and not, from a seed

export type Rng = () => number

export const rngFrom = (seed: number): Rng => {
	let a = seed >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export class Gen {
	rng: Rng

	constructor(rng: Rng) {
		this.rng = rng
	}

	chance(p: number): boolean {
		return this.rng() < p
	}

	int(max: number): number {
		return Math.floor(this.rng() * max)
	}

	pick<t>(items: readonly t[]): t {
		return items[this.int(items.length)]
	}

	weighted<t>(entries: readonly (readonly [number, () => t])[]): t {
		const total = entries.reduce((sum, [w]) => sum + w, 0)
		let r = this.rng() * total
		for (const [w, f] of entries) {
			r -= w
			if (r < 0) return f()
		}
		return entries[entries.length - 1][1]()
	}

	ws(): string {
		return this.weighted([
			[6, () => ""],
			[6, () => " "],
			[1, () => "  "],
			[0.3, () => "\t"],
			[0.2, () => "\n"]
		])
	}

	keyword(): string {
		return this.pick(keywords)
	}

	misspelled(): string {
		const base = this.keyword()
		return this.weighted([
			[1, () => base.slice(0, -1)],
			[1, () => base + this.pick(["s", "x", ".", "..", ".x"])],
			[1, () => base.toUpperCase()],
			[
				1,
				() => {
					const i = this.int(base.length)
					return base.slice(0, i) + base.slice(i + 1)
				}
			],
			[
				1,
				() => {
					const i = this.int(base.length - 1)
					return base.slice(0, i) + base[i + 1] + base[i] + base.slice(i + 2)
				}
			],
			[1, () => this.pick(foreignNames)],
			[
				1,
				() =>
					`${this.pick(["string", "number", "object", "Array", "Date", "unknown", "FormData", "TypedArray"])}.${this.pick(subkeywordNames)}`
			],
			[1, () => `${base}.${this.pick(subkeywordNames)}`],
			[0.5, () => `.${base}`],
			[0.3, () => `#${base}`]
		])
	}

	numberLiteral(): string {
		return this.pick(numberLiterals)
	}

	stringLiteral(): string {
		return this.pick(stringLiterals)
	}

	regexLiteral(): string {
		return this.pick(regexLiterals)
	}

	dateLiteral(): string {
		return this.pick(dateLiterals)
	}

	operand(depth: number): string {
		return this.weighted([
			[10, () => this.keyword()],
			[2, () => this.misspelled()],
			[3, () => this.numberLiteral()],
			[3, () => this.stringLiteral()],
			[1.5, () => this.regexLiteral()],
			[1, () => this.dateLiteral()],
			[0.5, () => "[]"],
			[depth > 0 ? 2 : 0, () => this.generic(depth - 1)],
			[
				depth > 0 ? 2 : 0,
				() => `(${this.ws()}${this.expr(depth - 1)}${this.ws()})`
			],
			[
				depth > 0 ? 1 : 0,
				() =>
					`keyof${this.pick([" ", " ", "  ", "", "\t"])}${this.operand(depth - 1)}`
			]
		])
	}

	generic(depth: number): string {
		const [name, arity] = this.pick(generics)
		const count = this.chance(0.85) ? arity : this.int(4)
		const args: string[] = []
		for (let i = 0; i < count; i++) {
			args.push(
				(
					this.chance(0.4) &&
						(name === "Record" || name === "Pick" || name === "Omit")
				) ?
					this.pick(keyArgs)
				:	this.expr(depth)
			)
		}
		const sep = () => this.pick([",", ", ", " , ", ",  "])
		const close = this.weighted([
			[20, () => ">"],
			[1, () => ""],
			[1, () => ">>"],
			[0.5, () => " >"]
		])
		return `${name}${this.chance(0.1) ? " " : ""}<${this.chance(0.2) ? " " : ""}${args.join(sep())}${close}`
	}

	limit(): string {
		return this.weighted([
			[8, () => this.pick(limitNumbers)],
			[2, () => this.dateLiteral()],
			[
				1,
				() =>
					this.pick([
						"'a'",
						"5n",
						"number",
						"x",
						"",
						"true",
						"(5)",
						"-",
						"1e400",
						"NaN",
						"Infinity",
						"0x10",
						"1_0"
					])
			]
		])
	}

	comparator(): string {
		return this.weighted([
			[3, () => "<"],
			[3, () => "<="],
			[3, () => ">"],
			[3, () => ">="],
			[1.5, () => "=="],
			[1.5, () => "!="],
			[0.5, () => this.pick(["=<", "=>", "<<", "!", "===", "<>", "!=="])]
		])
	}

	expr(depth: number): string {
		if (depth <= 0) return this.operand(0)
		return this.weighted([
			[6, () => this.operand(depth)],
			[
				3,
				() =>
					`${this.expr(depth - 1)}${this.ws()}|${this.ws()}${this.expr(depth - 1)}`
			],
			[
				2,
				() =>
					`${this.expr(depth - 1)}${this.ws()}&${this.ws()}${this.expr(depth - 1)}`
			],
			[
				0.5,
				() =>
					`${this.expr(depth - 1)}${this.ws()}|>${this.ws()}${this.expr(depth - 1)}`
			],
			[3, () => `${this.operand(depth - 1)}${this.ws()}[]`],
			[0.5, () => `${this.operand(depth - 1)}[][]`],
			[
				2,
				() =>
					`${this.operand(depth - 1)}${this.ws()}${this.comparator()}${this.ws()}${this.limit()}`
			],
			[
				1.5,
				() =>
					`${this.limit()}${this.ws()}${this.comparator()}${this.ws()}${this.operand(depth - 1)}`
			],
			[
				2,
				() =>
					`${this.limit()}${this.ws()}${this.comparator()}${this.ws()}${this.operand(depth - 1)}${this.ws()}${this.comparator()}${this.ws()}${this.limit()}`
			],
			[
				0.5,
				() =>
					`${this.operand(depth - 1)}${this.ws()}${this.comparator()}${this.ws()}${this.limit()}${this.ws()}${this.comparator()}${this.ws()}${this.limit()}`
			],
			[
				1.5,
				() =>
					`${this.operand(depth - 1)}${this.ws()}%${this.ws()}${this.pick(divisors)}`
			],
			[
				1,
				() => `${this.operand(depth - 1)}${this.ws()}#${this.pick(brandNames)}`
			]
		])
	}

	/** an expression, maybe with a suffix only a property allows */
	definition(depth: number): string {
		const e = this.expr(depth)
		return this.weighted([
			[10, () => e],
			[1.5, () => `${e}?`],
			[0.3, () => `${e} ?`],
			[
				2,
				() =>
					`${e}${this.pick([" = ", "=", " =", "= ", "  =  "])}${this.pick(defaultValues)}`
			]
		])
	}

	mutate(s: string): string {
		const chars = [...s]
		const i = this.int(chars.length + 1)
		return this.weighted([
			[2, () => s.slice(0, i) + s.slice(i + 1)],
			[2, () => s.slice(0, i) + this.pick(insertions) + s.slice(i)],
			[1, () => s.slice(0, i)],
			[1, () => s.slice(i)],
			[1, () => s.slice(0, i) + s[i] + s.slice(i)],
			[
				1,
				() => s.slice(0, i) + (s[i + 1] ?? "") + (s[i] ?? "") + s.slice(i + 2)
			]
		])
	}

	stringDef(): string {
		const depth = this.pick([0, 1, 1, 2, 2, 3])
		const def = this.definition(depth)
		return this.chance(0.25) ? this.mutate(def) : def
	}
}

export const keywords = [
	"string",
	"number",
	"bigint",
	"boolean",
	"symbol",
	"object",
	"unknown",
	"never",
	"null",
	"undefined",
	"true",
	"false",
	"Date",
	"Array",
	"RegExp",
	"Error",
	"Map",
	"Set",
	"Function",
	"Promise",
	"Key",
	"URL",
	"number.integer",
	"number.safe",
	"number.epoch",
	"number.NaN",
	"number.Infinity",
	"string.email",
	"string.uuid",
	"string.uuid.v4",
	"string.integer",
	"string.integer.parse",
	"string.numeric",
	"string.numeric.parse",
	"string.json",
	"string.json.parse",
	"string.date",
	"string.date.iso",
	"string.date.parse",
	"string.trim",
	"string.lower",
	"string.url",
	"string.ip",
	"string.ip.v4",
	"string.alpha",
	"string.digits",
	"string.semver",
	"string.normalize.NFC",
	"unknown.any",
	"object.json",
	"Array.readonly",
	"Array.index",
	"FormData.value",
	"TypedArray.Uint8",
	"Uint8Array"
]

const subkeywordNames = [
	"email",
	"integer",
	"parse",
	"json",
	"root",
	"uuid",
	"v4",
	"iso",
	"NaN",
	"x",
	"",
	"readonly",
	"preformatted",
	"index"
]

const foreignNames = [
	"any",
	"void",
	"String",
	"int",
	"email",
	"date",
	"number.int",
	"string.nonempty",
	"array",
	"nan",
	"string.datetime"
]

const numberLiterals = [
	"0",
	"-0",
	"1",
	"5",
	"1.5",
	"-1.5",
	"1e3",
	"1E3",
	"1e-3",
	"0x10",
	".5",
	"5.",
	"01",
	"00",
	"-.5",
	"1_000",
	"+1",
	"Infinity",
	"-Infinity",
	"NaN",
	"9007199254740993",
	"1e400",
	"5n",
	"-5n",
	"0n",
	"-0n",
	"05n",
	"1.5n",
	"0x10n",
	"10",
	"-1",
	"0.0",
	"1.0",
	"1.50",
	"-01",
	"0.1",
	"123456789012345678901234567890n"
]

const stringLiterals = [
	"'a'",
	'"a"',
	"'a b'",
	`"it's"`,
	"''",
	'""',
	"'a\\'b'",
	'"a\\"b"',
	"'a\\\\'",
	"'a",
	'"a',
	`'a"`,
	"'\\n'",
	"'|'",
	"'a|b'",
	"' '",
	"'5'",
	'"="',
	"'#'",
	"'('",
	"'a' ",
	"'\\a'",
	"'[]'",
	"'>'",
	"'a,b'",
	"'\\\\'"
]

const regexLiterals = [
	"/a/",
	"/a/i",
	"/^a$/",
	"/[/",
	"/a\\/b/",
	"//",
	"/a|b/",
	"/a b/",
	"x/a/",
	"x/(?<g>a)/",
	"x/a",
	"/a",
	"/\\d+/",
	"/(/",
	"/a{2}/",
	"/(?<x>a)(?<x>b)/",
	"/a/g",
	"/\\\\d/",
	"/[a-z]+/",
	"/a\\/",
	"x/^(?<year>\\d{4})-(?<month>\\d{2})$/",
	"x//"
]

const dateLiterals = [
	"d'2000'",
	'd"2000-01-01"',
	"d'invalid'",
	"d''",
	"d'2000",
	"d'1'",
	"d'-1'",
	"d'0'",
	"d'2000-01-01T00:00:00Z'",
	"d'1e3'",
	"d'2000-13-01'"
]

const limitNumbers = [
	"0",
	"1",
	"5",
	"10",
	"-1",
	"1.5",
	"0.5",
	"-0",
	"1e3",
	"01",
	"5.",
	".5",
	"100",
	"-5"
]

const divisors = [
	"2",
	"0",
	"1.5",
	"-2",
	"a",
	"2n",
	"0x2",
	"'2'",
	"1e1",
	"02",
	"",
	"3.0",
	"1",
	"10",
	"Infinity",
	"-0",
	"2 "
]

const brandNames = [
	"x",
	"foo",
	"a.b",
	"",
	"1",
	"x#y",
	"'q'",
	" x",
	"x[]",
	"Foo_bar"
]

const defaultValues = [
	"5",
	"'a'",
	'"a"',
	"true",
	"false",
	"null",
	"undefined",
	"[]",
	"{}",
	"d'2000'",
	"5n",
	"x",
	"'a",
	"-0",
	"1e3",
	"NaN",
	"Infinity",
	"string",
	"(5)",
	"5 | 6",
	"[] []",
	"' a '",
	"'a' 'b'",
	"",
	"0",
	"-1",
	"1.5",
	"''",
	"{ }",
	"[ ]",
	"0x10",
	"01",
	"'a' ",
	"5 ",
	"/a/",
	"x/a/",
	"5?",
	"-5n"
]

const keyArgs = [
	"'a'",
	"'a' | 'b'",
	"string",
	"number",
	"symbol",
	"boolean",
	"string.email",
	"'a'|'b'",
	"keyof Date",
	"Key",
	"1",
	"'a' | 1"
]

export const generics: readonly (readonly [string, number])[] = [
	["Record", 2],
	["Record", 2],
	["Partial", 1],
	["Required", 1],
	["Pick", 2],
	["Omit", 2],
	["Exclude", 2],
	["Extract", 2],
	["Merge", 2],
	["Array.liftFrom", 1],
	["Array", 1]
]

const insertions = [
	"<",
	">",
	"=",
	"|",
	"&",
	"(",
	")",
	"[",
	"]",
	"%",
	"#",
	"?",
	",",
	"'",
	'"',
	"/",
	" ",
	"!",
	".",
	"d",
	"x",
	"[]",
	"|>",
	"\\",
	"`",
	":"
]

// ---- objects, tuples and scopes, as coded values

export class StructureGen extends Gen {
	/** a definition in one of the ways it can be passed, or undefined for a scope exporting nothing to read */
	case(id: string): Case | undefined {
		return this.weighted<Case | undefined>([
			[45, () => ({ id, context: "root", def: this.stringDef() })],
			[18, () => ({ id, context: "prop", def: { a: this.stringDef() } })],
			[10, () => ({ id, context: "tuple", def: [this.stringDef()] })],
			[10, () => ({ id, context: "root", def: this.objectDef(1) })],
			[10, () => ({ id, context: "root", def: this.tupleDef(1) })],
			[8, () => ({ id, context: "args", def: this.tupleExpression(1) })],
			[
				8,
				() => {
					const { def, args } = this.genericDef()
					return { id, context: "generic", def, args }
				}
			],
			[
				8,
				() => {
					const { method, def } = this.fluentDef()
					return { id, context: "fluent", method, def }
				}
			],
			[
				4,
				() => {
					const { method, def } = this.fluentPropDef()
					return { id, context: "fluentProp", method, def }
				}
			],
			[3, () => ({ id, context: "match", def: this.matchDef() })],
			[2, () => ({ id, context: "fn", def: this.fnDef() })],
			[
				3,
				() => {
					const { method, def } = this.naryDef()
					return { id, context: "nary", method, def }
				}
			],
			[
				7,
				() => {
					const { def, aliases } = this.scopeDef()
					return aliases.length ?
							{ id, context: "scope", def, alias: this.pick(aliases) }
						:	undefined
				}
			]
		])
	}

	simpleDef(): string {
		return this.weighted([
			[4, () => this.keyword()],
			[1, () => this.stringLiteral()],
			[1, () => this.numberLiteral()],
			[2, () => this.expr(1)],
			[1, () => this.misspelled()]
		])
	}

	propertyValue(depth: number): unknown {
		return this.weighted<unknown>([
			[8, () => this.stringDef()],
			[1, () => [this.simpleDef(), "?"]],
			[1, () => [this.simpleDef(), "=", this.pick(tupleDefaultValues)]],
			[depth > 0 ? 1.5 : 0, () => this.objectDef(depth - 1)],
			[depth > 0 ? 1.5 : 0, () => this.tupleDef(depth - 1)],
			[0.3, () => [this.simpleDef(), "?", "x"]],
			[0.3, () => [this.simpleDef(), "="]]
		])
	}

	objectDef(depth: number): Record<string, unknown> {
		const def: Record<string, unknown> = {}
		const n = 1 + this.int(3)
		for (let i = 0; i < n; i++) {
			const key = this.pick(objectKeys)
			def[key] =
				key === "..." ?
					this.weighted<unknown>([
						[3, () => ({ b: this.simpleDef() })],
						[
							1,
							() =>
								this.pick([
									"object",
									"Date",
									"string",
									"{ a: string }",
									"Record<string, number>",
									"string[]",
									"never",
									"unknown"
								])
						],
						[1, () => typeValue]
					])
				: key === "+" ? this.pick(["reject", "delete", "ignore", "x", 5])
				: key === "@" ?
					this.pick<unknown>(["a description", { description: "x" }, 5, {}])
				:	this.propertyValue(depth)
		}
		return def
	}

	tupleElement(depth: number): unknown[] {
		return this.weighted<unknown[]>([
			[6, () => [this.stringDef()]],
			[
				1,
				() => [
					"...",
					this.pick([
						"string[]",
						"number[]",
						"[string, number]",
						"string",
						"unknown[]",
						"[]",
						"Array",
						"(string | number)[]",
						"string[] | [number]"
					])
				]
			],
			[1, () => [[this.simpleDef(), "?"]]],
			[1, () => [[this.simpleDef(), "=", this.pick(tupleDefaultValues)]]],
			[depth > 0 ? 1 : 0, () => [this.objectDef(depth - 1)]],
			[depth > 0 ? 1 : 0, () => [this.tupleDef(depth - 1)]],
			[0.3, () => ["..."]]
		])
	}

	tupleDef(depth: number): unknown[] {
		return this.weighted<unknown[]>([
			[
				4,
				() => {
					const n = this.int(4)
					const def: unknown[] = []
					for (let i = 0; i < n; i++) def.push(...this.tupleElement(depth))
					return def
				}
			],
			[3, () => this.tupleExpression(depth)]
		])
	}

	operandDef(depth: number): unknown {
		return this.weighted<unknown>([
			[6, () => this.simpleDef()],
			[depth > 0 ? 1 : 0, () => this.objectDef(depth - 1)],
			[depth > 0 ? 1 : 0, () => this.tupleDef(depth - 1)],
			[0.3, () => typeValue],
			[0.2, () => fnThunk],
			[0.2, () => 5]
		])
	}

	tupleExpression(depth: number): unknown[] {
		const l = this.operandDef(depth)
		const r = () => this.operandDef(depth)
		return this.weighted<unknown[]>([
			[2, () => [l, "[]"]],
			[3, () => [l, "|", r()]],
			[3, () => [l, "&", r()]],
			[1, () => [l, "|>", r()]],
			[1, () => [l, "=>", fnMorph]],
			[1, () => [l, ":", fnNarrow]],
			[0.5, () => [l, "=>", "x"]],
			[0.5, () => [l, ":", 5]],
			[
				1,
				() => [l, "@", this.pick<unknown>(["desc", { description: "x" }, 5])]
			],
			[1, () => [l, "?"]],
			[1, () => [l, "=", this.pick(tupleDefaultValues)]],
			[1, () => ["keyof", l]],
			[0.5, () => ["instanceof", ctorDate]],
			[0.5, () => ["instanceof", ctorDate, ctorMap]],
			[0.3, () => ["instanceof", "x"]],
			[0.5, () => ["===", 1, "a"]],
			[0.5, () => ["===", sym, 5n]],
			[0.5, () => [l, "|"]],
			[0.5, () => [l, "|", r(), r()]],
			[0.3, () => [l, "[]", r()]],
			[0.3, () => ["keyof"]],
			[0.3, () => ["keyof", l, r()]],
			[0.3, () => [l, "?", "x"]]
		])
	}

	scopeDef(): { def: Record<string, unknown>; aliases: string[] } {
		const names = ["a", "b", "#c", "box<t>", "pair<k, v>", "d", "#e<t>", "m"]
		const chosen = names.filter(() => this.chance(0.5))
		if (!chosen.length) chosen.push("a")
		const refs = chosen.map(n => n.replace(/^#/, "").replace(/<.*/, ""))
		const ref = (): string => {
			const i = this.int(refs.length)
			const n = chosen[i]
			const name = refs[i]
			return (
				n === "m" ?
					this.pick([
						"m",
						"m.x",
						"m.y",
						"m.z",
						"m.w",
						"m.root",
						"m.x[]",
						"m.z.a",
						"m.",
						"m.x.y",
						"#m.x"
					])
				: n.includes("<t>") ? `${name}<${this.simpleDef()}>`
				: n.includes("<k, v>") ?
					`${name}<${this.simpleDef()}, ${this.simpleDef()}>`
				: this.chance(0.1) ? `#${name}`
				: name
			)
		}
		const def: Record<string, unknown> = {}
		for (const n of chosen) {
			if (n === "m") {
				def[n] = this.pick([mod, modRoot])
				continue
			}
			const params =
				n.includes("<t>") ? ["t"]
				: n.includes("<k, v>") ? ["k", "v"]
				: []
			const atom = () =>
				this.weighted([
					[3, () => ref()],
					[params.length ? 3 : 0, () => this.pick(params)],
					[3, () => this.simpleDef()],
					[0.5, () => "this"]
				])
			def[n] = this.weighted<unknown>([
				[4, () => atom()],
				[3, () => `${atom()} | ${atom()}`],
				[1, () => `${atom()}[]`],
				[1, () => `${atom()} & ${atom()}`],
				[2, () => ({ x: atom(), "y?": atom() })],
				[1, () => [atom(), atom()]],
				[0.5, () => `keyof ${atom()}`],
				[0.5, () => this.mutate(atom())]
			])
		}
		return {
			def,
			aliases: refs.filter(
				(_, i) =>
					!chosen[i].startsWith("#") &&
					!chosen[i].includes("<") &&
					chosen[i] !== "m"
			)
		}
	}

	genericDef(): { def: unknown[]; args: unknown[] } {
		const [params, names] = this.pick(genericParams)
		const atom = () =>
			this.weighted<string>([
				[names.length ? 4 : 0, () => this.pick(names)],
				[3, () => this.simpleDef()],
				[0.3, () => "this"],
				[0.3, () => "u"]
			])
		const body = this.weighted<unknown>([
			[3, () => atom()],
			[3, () => `${atom()} | ${atom()}`],
			[1, () => `${atom()}[]`],
			[1, () => `${atom()} & ${atom()}`],
			[2, () => ({ x: atom(), "y?": atom() })],
			[1, () => [atom(), atom()]],
			[0.5, () => `keyof ${atom()}`],
			[0.5, () => `Record<${atom()}, ${atom()}>`],
			[0.5, () => ({ "...": atom(), z: atom() })],
			[0.5, () => `${atom()} > 5`],
			[0.5, () => `${atom()} = 5`],
			[0.5, () => ({ "[t]": atom() })],
			[0.5, () => this.mutate(atom())]
		])
		const n = this.weighted<number>([
			[8, () => names.length],
			[1, () => names.length + 1],
			[1, () => Math.max(0, names.length - 1)]
		])
		const args: unknown[] = []
		for (let i = 0; i < n; i++)
			args.push(this.chance(0.15) ? this.objectDef(0) : this.simpleDef())
		return { def: [params, body], args }
	}

	/** .default() or .optional(), which only a prop can be */
	fluentPropDef(): { method: string; def: unknown[] } {
		const base = this.weighted<unknown>([
			[4, () => this.simpleDef()],
			[1, () => this.objectDef(0)],
			[0.5, () => this.tupleDef(0)]
		])
		return this.weighted<{ method: string; def: unknown[] }>([
			[
				3,
				() => ({
					method: "default",
					def: [
						base,
						this.pick<unknown>([
							0,
							1,
							-1,
							1.5,
							NaN,
							"a",
							"",
							"5",
							"2000-01-01",
							5n,
							true,
							false,
							null,
							undefined,
							[],
							{},
							{ a: "x" },
							coded("new Date(0)", new Date(0)),
							coded("() => 0", () => 0),
							coded('() => "a"', () => "a"),
							coded("() => ({})", () => ({})),
							coded("() => []", () => []),
							coded("() => undefined", () => undefined)
						])
					]
				})
			],
			[1, () => ({ method: "optional", def: [base] })]
		])
	}

	fluentDef(): { method: string; def: unknown[] } {
		const base = () =>
			this.weighted<unknown>([
				[4, () => this.simpleDef()],
				[1, () => this.objectDef(0)],
				[0.5, () => this.tupleDef(0)]
			])
		return this.weighted<{ method: string; def: unknown[] }>([
			[3, () => ({ method: "or", def: [base(), base()] })],
			[3, () => ({ method: "and", def: [base(), base()] })],
			[2, () => ({ method: "merge", def: [base(), base()] })],
			[1, () => ({ method: "to", def: [base(), base()] })],
			[1, () => ({ method: "pipe", def: [base(), typeValue] })],
			[1, () => ({ method: "extract", def: [base(), base()] })],
			[1, () => ({ method: "exclude", def: [base(), base()] })],
			[1, () => ({ method: "keyof", def: [base()] })],
			[1, () => ({ method: "array", def: [base()] })],
			[0.5, () => ({ method: "partial", def: [base()] })],
			[0.5, () => ({ method: "required", def: [base()] })],
			[
				0.5,
				() => ({ method: "pick", def: [base(), this.pick(["a", "b", "x"])] })
			],
			[
				0.5,
				() => ({ method: "omit", def: [base(), this.pick(["a", "b", "x"])] })
			],
			[
				0.5,
				() => ({ method: "get", def: [base(), this.pick(["a", "b", 0, "x"])] })
			],
			[
				0.5,
				() => ({
					method: "atLeastLength",
					def: [base(), this.pick([0, 1, -1, 1.5])]
				})
			],
			[
				0.5,
				() => ({
					method: "moreThan",
					def: [base(), this.pick([0, 1, -1, 1.5])]
				})
			],
			[
				0.5,
				() => ({
					method: "divisibleBy",
					def: [base(), this.pick([0, 2, -1, 1.5])]
				})
			],
			[
				0.3,
				() => ({
					method: this.pick(["lessThan", "atMost", "atLeast"]),
					def: [base(), this.pick([0, 1, -1, 1.5, NaN])]
				})
			],
			[
				0.3,
				() => ({
					method: this.pick([
						"laterThan",
						"earlierThan",
						"atOrAfter",
						"atOrBefore"
					]),
					def: [
						base(),
						this.pick<unknown>([
							"2000-01-01",
							"x",
							0,
							coded("new Date(0)", new Date(0))
						])
					]
				})
			],
			[
				0.3,
				() => ({
					method: this.pick([
						"atMostLength",
						"lessThanLength",
						"moreThanLength",
						"exactlyLength"
					]),
					def: [base(), this.pick([0, 1, -1, 1.5])]
				})
			],
			[
				0.3,
				() => ({
					method: "matching",
					def: [
						base(),
						this.pick<unknown>([
							"^a",
							"[",
							"a{2,1}",
							"\\q",
							{ rule: "^a$" },
							{ rule: "(" }
						])
					]
				})
			],
			[0.3, () => ({ method: "brand", def: [base(), this.pick(["x", ""])] })],
			[
				0.3,
				() => ({
					method: "onUndeclaredKey",
					def: [base(), this.pick(["reject", "delete", "ignore", "x"])]
				})
			],
			[
				0.3,
				() => ({
					method: "onDeepUndeclaredKey",
					def: [base(), this.pick(["reject", "delete", "x"])]
				})
			],
			[
				0.3,
				() => ({
					method: this.pick(["narrow", "filter"]),
					def: [base(), fnNarrow]
				})
			],
			[
				0.3,
				() => ({
					method: "describe",
					def: [base(), this.pick<unknown>(["x", 5])]
				})
			]
		])
	}

	fnDef(): unknown[] {
		const def: unknown[] = []
		const n = this.int(4)
		for (let i = 0; i < n; i++)
			def.push(this.chance(0.8) ? this.stringDef() : this.operandDef(0))
		if (this.chance(0.5)) def.push(":", this.stringDef())
		else if (this.chance(0.1)) def.push(":")
		// eslint-disable-next-line no-dupe-else-if -- each chance() draws anew
		else if (this.chance(0.1)) def.push(":", "string", ":", "number")
		return def
	}

	matchDef(): Record<string, unknown> {
		const def: Record<string, unknown> = {}
		const n = this.int(3)
		for (let i = 0; i < n; i++) def[this.stringDef()] = fnMorph
		if (this.chance(0.6)) {
			def.default = this.pick<unknown>([
				"assert",
				"never",
				"reject",
				fnMorph,
				"x"
			])
		}
		return def
	}

	naryDef(): { method: string; def: unknown[] } {
		const operand = () =>
			this.weighted<unknown>([
				[4, () => this.simpleDef()],
				[1, () => this.objectDef(0)],
				[0.5, () => this.tupleDef(0)],
				[0.3, () => typeValue],
				[0.3, () => fnMorph]
			])
		const n = this.weighted<number>([
			[1, () => 0],
			[2, () => 1],
			[4, () => 2],
			[3, () => 3]
		])
		const def: unknown[] = []
		for (let i = 0; i < n; i++) def.push(operand())
		return this.weighted<{ method: string; def: unknown[] }>([
			[8, () => ({ method: this.pick(["or", "and", "merge", "pipe"]), def })],
			[
				1,
				() => ({
					method: "enumerated",
					def: Array.from({ length: this.int(4) }, () => this.pick(unitValues))
				})
			],
			[0.5, () => ({ method: "unit", def: [this.pick(unitValues)] })],
			[
				1,
				() => ({
					method: "Record",
					def: [this.pick(recordKeys), this.simpleDef()]
				})
			],
			[
				0.3,
				() => ({
					method: "instanceOf",
					def: [this.pick<unknown>([ctorDate, ctorMap, "Date", 5])]
				})
			]
		])
	}
}

// values a unit or enumerated Type is made of, which it compares by identity
const unitValues: readonly unknown[] = [
	0,
	-0,
	1,
	1.5,
	NaN,
	Infinity,
	"",
	"a",
	"5",
	5n,
	true,
	false,
	null,
	undefined,
	sym
]

// what a Record's keys are defined as
const recordKeys: readonly string[] = [
	"string",
	"symbol",
	"number",
	"'a' | 'b'",
	"'a'",
	"string.integer.parse",
	"string.email",
	"1",
	"Key",
	"string | number",
	"unknown"
]

const genericParams: readonly (readonly [string, readonly string[]])[] = [
	["<t>", ["t"]],
	["<t>", ["t"]],
	["<t extends string>", ["t"]],
	["<t extends object>", ["t"]],
	["<t extends number>", ["t"]],
	["<t extends Key>", ["t"]],
	["<t extends string | number>", ["t"]],
	["<t, u>", ["t", "u"]],
	["<k extends Key, v>", ["k", "v"]],
	["<t extends number, u extends t>", ["t", "u"]],
	["<t extends string[]>", ["t"]],
	["<t extends Date>", ["t"]],
	["<t extends 5 | 6>", ["t"]],
	["<t extends string.numeric.parse>", ["t"]],
	["<>", []],
	["<t extends>", ["t"]],
	["<t,>", ["t"]],
	["<t t>", ["t"]],
	["<1>", []],
	["<t extends strng>", ["t"]],
	["<t, t>", ["t"]],
	["< t >", ["t"]],
	["<t extends never>", ["t"]],
	["<t extends unknown.any>", ["t"]]
]

const objectKeys = [
	"a",
	"a",
	"b",
	"a?",
	"b?",
	"a\\?",
	"\\a",
	"[string]",
	"[string]?",
	"\\[string]",
	"\\[string]?",
	"[number]",
	"[symbol]",
	"[string.email]",
	"['a'|'b']",
	"[boolean]",
	"[strng]",
	"[]",
	"[",
	"]",
	"...",
	"\\...",
	"+",
	"\\+",
	"@",
	"\\@",
	"?",
	"\\?",
	"a??",
	"a\\??",
	" a",
	"[ string ]",
	"[string|number]",
	"1",
	"[Key]",
	"[string | symbol]",
	"[/a/]",
	"[string.numeric]",
	"[keyof Date]",
	"[d'2000']",
	"['a']",
	"[1]",
	"\\\\[string]",
	"[string]\\?",
	"[[string]]"
]

const tupleDefaultValues: unknown[] = [
	5,
	"a",
	true,
	null,
	undefined,
	0,
	"",
	5n,
	fnThunkDefault()
]

function fnThunkDefault(): unknown {
	return coded("() => 5", () => 5)
}
