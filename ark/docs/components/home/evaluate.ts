import { type } from "arktype"
import type { LiveState } from "./liveState.ts"

// definitions typed into the page are only known at runtime
const define = type as unknown as (def: string) => {
	(data: unknown): unknown
	description: string
	expression: string
}

const unreadable = Symbol("unreadable")

const escapes: Record<string, string> = {
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "\t",
	v: "\v",
	0: "\0"
}

const keywords: Record<string, unknown> = {
	true: true,
	false: false,
	null: null,
	undefined,
	NaN,
	Infinity
}

const numberPattern =
	/^[+-]?(?:0x[\da-f]+|0o[0-7]+|0b[01]+|(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/i
const bigintPattern = /^[+-]?(?:0x[\da-f]+|0o[0-7]+|0b[01]+|\d+)n/i
const identifierPattern = /^[$A-Z_a-z][\w$]*/

/**
 * Reads `src` as the JS literal it would be in T(…): strings in any quotes,
 * numbers, bigints, true, false, null, undefined, NaN, Infinity, arrays and
 * objects with bare or quoted keys. Anything else, like a bare word that
 * would be a ReferenceError, is unreadable rather than a string.
 */
const readLiteral = (src: string): unknown => {
	let i = 0
	const fail = (): never => {
		throw unreadable
	}
	const skip = () => {
		while (/\s/.test(src[i] ?? "")) i++
	}
	const match = (pattern: RegExp) => {
		const text = pattern.exec(src.slice(i))?.[0]
		if (text) i += text.length
		return text
	}
	const take = (char: string) => {
		skip()
		if (src[i] !== char) return false
		i++
		return true
	}
	const string = () => {
		const quote = src[i++]
		let s = ""
		while (src[i] !== quote) {
			const char = src[i++] ?? fail()
			if (quote === "`" && char === "$" && src[i] === "{") fail()
			if (char !== "\\") {
				if (char === "\n" && quote !== "`") fail()
				s += char
				continue
			}
			const next = src[i++] ?? fail()
			const hex =
				next === "u" ?
					src[i] === "{" ?
						/^{([\da-f]{1,6})}/i.exec(src.slice(i))
					:	/^[\da-f]{4}/i.exec(src.slice(i))
				: next === "x" ? /^[\da-f]{2}/i.exec(src.slice(i))
				: undefined
			if (hex === undefined) s += escapes[next] ?? next
			else if (hex === null) fail()
			else {
				const code = parseInt(hex[1] ?? hex[0], 16)
				if (code > 0x10ffff) fail()
				s += String.fromCodePoint(code)
				i += hex[0].length
			}
		}
		i++
		return s
	}
	const signed = (text: string, read: (digits: string) => number | bigint) => {
		const magnitude = read(text.replace(/^[+-]/, ""))
		return text.startsWith("-") ? -magnitude : magnitude
	}
	const value = (): unknown => {
		skip()
		const char = src[i]
		if (char === '"' || char === "'" || char === "`") return string()
		if (take("[")) {
			const items: unknown[] = []
			while (!take("]")) {
				items.push(value())
				if (take(",")) continue
				if (!take("]")) fail()
				break
			}
			return items
		}
		if (take("{")) {
			const entries: [string, unknown][] = []
			while (!take("}")) {
				skip()
				const number = match(numberPattern)
				const key =
					src[i] === '"' || src[i] === "'" ? string()
					: number ? String(Number(number))
					: (match(identifierPattern) ?? fail())
				if (!take(":")) fail()
				entries.push([key, value()])
				if (take(",")) continue
				if (!take("}")) fail()
				break
			}
			return Object.fromEntries(entries)
		}
		const bigint = match(bigintPattern)
		if (bigint) return signed(bigint.slice(0, -1), BigInt)
		const sign = /[+-]/.test(char ?? "") ? src[i++] : ""
		const word = match(identifierPattern)
		if (word !== undefined) {
			if (!Object.hasOwn(keywords, word)) fail()
			const keyword = keywords[word]
			if (!sign) return keyword
			if (typeof keyword !== "number") fail()
			return sign === "-" ? -(keyword as number) : keyword
		}
		i -= sign.length
		const number = match(numberPattern) ?? fail()
		return signed(number, Number)
	}
	skip()
	// T() passes undefined
	if (i === src.length) return undefined
	const result = value()
	skip()
	return i === src.length ? result : fail()
}

/** a value as you'd write it in JS, compact like JSON.stringify */
const show = (v: unknown): string =>
	typeof v === "string" ? JSON.stringify(v)
	: typeof v === "bigint" ? `${v}n`
	: typeof v === "function" ? "[Function]"
	: typeof v !== "object" || v === null ? String(v)
	: v instanceof Date ?
		Number.isNaN(v.getTime()) ?
			"Invalid Date"
		:	`new Date(${JSON.stringify(v.toISOString())})`
	: Array.isArray(v) ? `[${v.map(show).join(",")}]`
	: `{${Object.entries(v)
			.map(([k, x]) => `${JSON.stringify(k)}:${show(x)}`)
			.join(",")}}`

/** parses `def` with the real parser, then validates `arg` against it */
export const evaluate = (def: string, arg: string): LiveState => {
	let T: ReturnType<typeof define>
	try {
		T = define(def)
	} catch (e) {
		return {
			def,
			ok: false,
			message: e instanceof Error ? e.message : String(e),
			out: "// fix the definition to validate"
		}
	}
	const parsed = {
		def,
		ok: true,
		description: T.description,
		expression: T.expression
	} as const
	let data: unknown
	try {
		data = readLiteral(arg)
	} catch (e) {
		if (e !== unreadable) throw e
		return {
			...parsed,
			out: "// can't read that value: write a JS literal",
			outOk: false
		}
	}
	const result = T(data)
	const invalid = result instanceof type.errors
	return {
		...parsed,
		out: invalid ? `// ArkErrors: ${result.summary}` : `// ${show(result)}`,
		outOk: !invalid
	}
}
