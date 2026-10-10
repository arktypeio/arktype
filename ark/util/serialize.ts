import type { array } from "./arrays.ts"
import { domainOf, type Primitive } from "./domain.ts"
import { throwInternalError } from "./errors.ts"
import {
	constructorNameOf,
	expressionOf,
	functionNameOf,
	isDate,
	ownEntriesOf,
	toJsonMethodOf
} from "./facts.ts"
import { objectKindOf } from "./objectKinds.ts"
import { serializePrimitive, type SerializablePrimitive } from "./primitive.ts"
import type { dict } from "./records.ts"

export type SerializationOptions = {
	onCycle?: (value: object) => string
	onSymbol?: (value: symbol) => string
	onFunction?: (value: Function) => string
	onUndefined?: string
	onBigInt?: (value: bigint) => string
	// describes an accessor instead of calling it, and then only a Date's toJSON is called
	onAccessor?: (descriptor: PropertyDescriptor) => string
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
	// print own data properties without running accessors or toJSON
	ownDataOnly?: boolean
}

export const print = (data: unknown, opts?: PrintableOptions): void =>
	console.log(printable(data, opts))

export const printable = (data: unknown, opts?: PrintableOptions): string => {
	switch (domainOf(data)) {
		case "object":
			const o = data as dict
			const ctorName = constructorNameOf(o) ?? "Object"
			const serializationOpts =
				opts?.ownDataOnly ? ownDataPrintableOpts : printableOpts
			return (
				ctorName === "Object" || ctorName === "Array" ?
					opts?.quoteKeys === false ?
						stringifyUnquoted(o, opts?.indent ?? 0, "", serializationOpts)
					:	JSON.stringify(
							_serialize(o, serializationOpts, []),
							null,
							opts?.indent
						).replace(quotedBigIntMarker, "$1")
				:	stringifyUnquoted(o, opts?.indent ?? 0, "", serializationOpts)
			)
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		default:
			return serializePrimitive(data as SerializablePrimitive)
	}
}

// printable as errors print data, without its options, so a top-level Array
// subclass prints by its class rather than its elements
export const printCompact = (data: unknown): string => {
	if (typeof data === "function") return printableOpts.onFunction(data)
	if (typeof data === "symbol") return printableOpts.onSymbol(data)
	if (typeof data !== "object" || data === null)
		return serializePrimitive(data as SerializablePrimitive)
	const ctorName = constructorNameOf(data) ?? "Object"
	return (
		ctorName === "Object" || ctorName === "Array" ?
			JSON.stringify(_serialize(data, printableOpts, [])).replace(
				quotedBigIntMarker,
				"$1"
			)
		: isDate(data) ? describeCollapsibleDate(data)
		: (expressionOf(data) ?? ctorName)
	)
}

// data a check can't accept as an object, which prints an object by its kind
export const printKind = (data: unknown): string =>
	typeof data === "function" ? "a function"
	: typeof data !== "object" || data === null ? printCompact(data)
	: Array.isArray(data) ? "an array"
	: "an object"

const stringifyUnquoted = (
	value: unknown,
	indent: number,
	currentIndent: string,
	opts: SerializationOptions
): string => {
	if (typeof value === "function") return printableOpts.onFunction(value)
	if (typeof value !== "object" || value === null)
		return serializePrimitive(value as never)

	const nextIndent = currentIndent + " ".repeat(indent)

	if (Array.isArray(value)) {
		if (value.length === 0) return "[]"
		const items = value
			.map(item => stringifyUnquoted(item, indent, nextIndent, opts))
			.join(",\n" + nextIndent)
		return indent ? `[\n${nextIndent}${items}\n${currentIndent}]` : `[${items}]`
	}

	const ctorName = constructorNameOf(value) ?? "Object"

	if (ctorName === "Object") {
		const keyValues = ownEntriesOf(value, opts).map(([key, val]) => {
			const stringifiedKey =
				typeof key === "symbol" ? printableOpts.onSymbol(key)
				: isDotAccessible(key) ? key
				: JSON.stringify(key)
			const stringifiedValue = stringifyUnquoted(val, indent, nextIndent, opts)
			return `${nextIndent}${stringifiedKey}: ${stringifiedValue}`
		})

		if (keyValues.length === 0) return "{}"

		return indent ?
				`{\n${keyValues.join(",\n")}\n${currentIndent}}`
			:	`{${keyValues.join(", ")}}`
	}

	if (isDate(value)) return describeCollapsibleDate(value)

	return expressionOf(value) ?? ctorName
}

const printableOpts = {
	onCycle: () => "(cycle)",
	onSymbol: v => `Symbol(${baseNameOf(v)})`,
	onFunction: v => `Function(${baseNameOf(v)})`,
	// prefix bigints with a marker so printable can strip the quotes
	// JSON.stringify adds, e.g. [1n] rather than ["1n"]
	onBigInt: n => `${bigIntMarker}${n}n`
} satisfies SerializationOptions

const ownDataPrintableOpts = {
	...printableOpts,
	onAccessor: descriptor => (descriptor.get ? "(getter)" : "(setter)")
} satisfies SerializationOptions

// private use character that JSON.stringify leaves unescaped
const bigIntMarker = "\uE000"

const quotedBigIntMarker = new RegExp(`"${bigIntMarker}(-?\\d+n)"`, "g")

const _serialize = (
	data: unknown,
	opts: SerializationOptions,
	seen: unknown[]
): unknown => {
	switch (domainOf(data)) {
		case "object": {
			const o = data as object
			const toJson =
				!opts.onAccessor || isDate(o) ? toJsonMethodOf(o) : undefined
			if (toJson) return Reflect.apply(toJson, o, [])
			if (typeof o === "function") return printableOpts.onFunction(o)

			if (seen.includes(o)) return "(cycle)"

			const nextSeen = [...seen, o]
			if (Array.isArray(o))
				return o.map(item => _serialize(item, opts, nextSeen))

			if (isDate(o)) return o.toDateString()

			const result: Record<string, unknown> = {}
			for (const [k, v] of ownEntriesOf(o, opts)) {
				result[
					typeof k === "symbol" ? (opts.onSymbol?.(k) ?? k.toString()) : k
				] = _serialize(v, opts, nextSeen)
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
	const year = date.getUTCFullYear()
	const month = date.getUTCMonth()
	const dayOfMonth = date.getUTCDate()
	const hours = date.getUTCHours()
	const minutes = date.getUTCMinutes()
	const seconds = date.getUTCSeconds()
	const milliseconds = date.getUTCMilliseconds()

	if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0) {
		return month === 0 && dayOfMonth === 1 ?
				`${year}`
			:	`${months[month]} ${dayOfMonth}, ${year}`
	}

	const h = hours % 12 || 12
	const suffix = hours < 12 ? " AM" : " PM"

	let timePortion =
		seconds || milliseconds ?
			`${h}:${pad(minutes, 2)}:${pad(seconds, 2)}`
		:	`${h}:${pad(minutes, 2)}`

	if (milliseconds) timePortion += `.${pad(milliseconds, 3)}`

	return `${months[month]} ${dayOfMonth}, ${year}, ${timePortion + suffix} UTC`
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

const pad = (value: number, length: number) =>
	String(value).padStart(length, "0")

export const isDotAccessible = (keyName: string): boolean =>
	/^[$A-Z_a-z][\w$]*$/.test(keyName)

export const baseNameOf = (value: object | symbol): string => {
	switch (typeof value) {
		case "object": {
			if (value === null) break

			const prefix = objectKindOf(value) ?? "object"
			// convert to camelCase
			return prefix[0].toLowerCase() + prefix.slice(1)
		}
		case "function":
			return isDotAccessible(functionNameOf(value)) ?
					functionNameOf(value)
				:	"fn"
		case "symbol":
			return value.description && isDotAccessible(value.description) ?
					value.description
				:	"symbol"
	}
	return throwInternalError(
		`Unexpected attempt to register serializable value of type ${domainOf(
			value
		)}`
	)
}
