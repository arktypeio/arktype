import type { array } from "./arrays.ts"
import { domainOf, type Primitive } from "./domain.ts"
import { serializePrimitive, type SerializablePrimitive } from "./primitive.ts"
import type { dict } from "./records.ts"
import { register } from "./registry.ts"

export type SerializationOptions = {
	onCycle?: (value: object) => string
	onSymbol?: (value: symbol) => string
	onFunction?: (value: Function) => string
	onUndefined?: string
	onBigInt?: (value: bigint) => string
}

export type Json = JsonObject | JsonArray

export interface JsonObject {
	[k: string]: JsonData
}

export type JsonArray = JsonData[]

export type JsonPrimitive = string | boolean | number | null

export type JsonData = Json | JsonPrimitive

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
			[k in keyof t]: snapshot<t[k], [...depth, 1]>
		}

type snapshotPrimitive<t> = t extends symbol ? `(Symbol${string})` : t

export const print = (data: unknown, indent?: number): void =>
	console.log(printable(data, indent))

export const printable = (data: unknown, indent?: number): string => {
	switch (domainOf(data)) {
		case "object":
			const o = data as dict
			const ctorName = o.constructor.name
			return (
				ctorName === "Object" || ctorName === "Array" ?
					JSON.stringify(_serialize(o, printableOpts, []), null, indent)
				: o instanceof Date ? describeCollapsibleDate(o)
				: typeof o.expression === "string" ? o.expression
				: ctorName
			)
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		default:
			return serializePrimitive(data as SerializablePrimitive)
	}
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

			return result
		}
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		case "bigint":
			return opts.onBigInt?.(data as bigint) ?? `${data}n`
		case "undefined":
			return opts.onUndefined ?? "undefined"
		default:
			return data
	}
}

/**
 * Converts a Date instance to a human-readable description relative to its precision
 *
 * @param {Date} date
 * @returns {string} - The generated description
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
