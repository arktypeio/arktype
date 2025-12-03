import type { array } from "./arrays.ts"
import { domainOf, type Primitive } from "./domain.ts"
import { serializePrimitive, type SerializablePrimitive } from "./primitive.ts"
import { stringAndSymbolicEntriesOf, type dict } from "./records.ts"
import { isDotAccessible, register } from "./registry.ts"

export type SerializationOptions = {
	onCycle?: (value: object) => string
	onSymbol?: (value: symbol) => string
	onFunction?: (value: Function) => string
	onUndefined?: string
	onBigInt?: (value: bigint) => string
}

export type JsonStructure = JsonObject | JsonArray

export interface JsonObject {
	[k: string]: Json
}

export type JsonArray = Json[]

export type JsonPrimitive = string | boolean | number | null

export type Json = JsonStructure | JsonPrimitive

export const snapshot = <t>(
	data: t,
	opts: SerializationOptions = {}
): snapshot<t> =>
	_serialize(
		data,
		{
			onUndefined: `$ark.undefined`,
			onBigInt: n => `$ark.bigint-${n}`,
			...opts
		},
		[]
	) as never

export type snapshot<t, depth extends 1[] = []> =
	unknown extends t ? unknown
	: t extends Primitive ? snapshotPrimitive<t>
	: t extends { toJSON: () => infer serialized } ? serialized
	: t extends Function ? `Function(${string})`
	: t extends Date ? string
	: depth["length"] extends 10 ? unknown
	: t extends array<infer item> ? array<snapshot<item, [...depth, 1]>>
	: {
			[k in keyof t as snapshotPrimitive<k>]: snapshot<t[k], [...depth, 1]>
		}

type snapshotPrimitive<t> = t extends symbol ? `Symbol(${string})` : t

export type PrintableOptions = {
	indent?: number
	quoteKeys?: boolean
}

export const print = (data: unknown, opts?: PrintableOptions): void =>
	console.log(printable(data, opts))

export const printable = (data: unknown, opts?: PrintableOptions): string => {
	switch (domainOf(data)) {
		case "object":
			const o = data as dict
			const ctorName = o.constructor?.name ?? "Object"
			return (
				ctorName === "Object" || ctorName === "Array" ?
					opts?.quoteKeys === false ?
						stringifyUnquoted(o, opts?.indent ?? 0, "")
					:	JSON.stringify(_serialize(o, printableOpts, []), null, opts?.indent)
				:	stringifyUnquoted(o, opts?.indent ?? 0, "")
			)
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		default:
			return serializePrimitive(data as SerializablePrimitive)
	}
}

const stringifyUnquoted = (
	value: unknown,
	indent: number,
	currentIndent: string
): string => {
	if (typeof value === "function") return printableOpts.onFunction(value)
	if (typeof value !== "object" || value === null)
		return serializePrimitive(value as never)

	const nextIndent = currentIndent + " ".repeat(indent)

	if (Array.isArray(value)) {
		if (value.length === 0) return "[]"
		const items = value
			.map(item => stringifyUnquoted(item, indent, nextIndent))
			.join(",\n" + nextIndent)
		return indent ? `[\n${nextIndent}${items}\n${currentIndent}]` : `[${items}]`
	}

	const ctorName = value.constructor?.name ?? "Object"

	if (ctorName === "Object") {
		const keyValues = stringAndSymbolicEntriesOf(value).map(([key, val]) => {
			const stringifiedKey =
				typeof key === "symbol" ? printableOpts.onSymbol(key)
				: isDotAccessible(key) ? key
				: JSON.stringify(key)
			const stringifiedValue = stringifyUnquoted(val, indent, nextIndent)
			return `${nextIndent}${stringifiedKey}: ${stringifiedValue}`
		})

		if (keyValues.length === 0) return "{}"

		return indent ?
				`{\n${keyValues.join(",\n")}\n${currentIndent}}`
			:	`{${keyValues.join(", ")}}`
	}

	if (value instanceof Date) return describeCollapsibleDate(value)

	if ("expression" in value && typeof value.expression === "string")
		return value.expression

	return ctorName
}

const printableOpts = {
	onCycle: () => "(cycle)",
	onSymbol: v => `Symbol(${register(v)})`,
	onFunction: v => `Function(${register(v)})`
} satisfies SerializationOptions

const _serialize = (
	data: unknown,
	opts: SerializationOptions,
	seen: unknown[]
): unknown => {
	switch (domainOf(data)) {
		case "object": {
			const o = data as object
			if ("toJSON" in o && typeof o.toJSON === "function") return o.toJSON()
			if (typeof o === "function") return printableOpts.onFunction(o)

			if (seen.includes(o)) return "(cycle)"

			const nextSeen = [...seen, o]
			if (Array.isArray(o))
				return o.map(item => _serialize(item, opts, nextSeen))

			if (o instanceof Date) return o.toDateString()

			const result: Record<string, unknown> = {}
			for (const k in o) result[k] = _serialize((o as any)[k], opts, nextSeen)

			for (const s of Object.getOwnPropertySymbols(o)) {
				result[opts.onSymbol?.(s as symbol) ?? s.toString()] = _serialize(
					(o as any)[s],
					opts,
					nextSeen
				)
			}

			return result
		}
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		case "bigint":
			return opts.onBigInt?.(data as bigint) ?? `${data}n`
		case "undefined":
			return opts.onUndefined ?? "undefined"
		case "string":
			return (data as string).replace(/\\/g, "\\\\")
		default:
			return data
	}
}

/**
 * Converts a Date instance to a human-readable description relative to its precision
 */
export const describeCollapsibleDate = (date: Date): string => {
	const year = date.getFullYear()
	const month = date.getMonth()
	const dayOfMonth = date.getDate()
	const hours = date.getHours()
	const minutes = date.getMinutes()
	const seconds = date.getSeconds()
	const milliseconds = date.getMilliseconds()

	if (
		month === 0 &&
		dayOfMonth === 1 &&
		hours === 0 &&
		minutes === 0 &&
		seconds === 0 &&
		milliseconds === 0
	)
		return `${year}`

	const datePortion = `${months[month]} ${dayOfMonth}, ${year}`

	if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0)
		return datePortion

	let timePortion = date.toLocaleTimeString()

	const suffix =
		timePortion.endsWith(" AM") || timePortion.endsWith(" PM") ?
			timePortion.slice(-3)
		:	""

	if (suffix) timePortion = timePortion.slice(0, -suffix.length)

	if (milliseconds) timePortion += `.${pad(milliseconds, 3)}`
	else if (timeWithUnnecessarySeconds.test(timePortion))
		timePortion = timePortion.slice(0, -3)

	return `${timePortion + suffix}, ${datePortion}`
}

const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
]

const timeWithUnnecessarySeconds = /:\d\d:00$/

const pad = (value: number, length: number) =>
	String(value).padStart(length, "0")
