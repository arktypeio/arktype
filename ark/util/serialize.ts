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
import { isArray, objectKindOf } from "./objectKinds.ts"
import { serializePrimitive, type SerializablePrimitive } from "./primitive.ts"
import type { dict } from "./records.ts"

export type SerializationOptions = {
	onCycle?: (value: object) => string
	onSymbol?: (value: symbol) => string
	onFunction?: (value: Function) => string
	onUndefined?: string
	onBigInt?: (value: bigint) => string
	// describes accessors instead of calling them; also skips toJSON but a Date's
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
						).replace(quotedMarkedValue, "$1")
				:	stringifyUnquoted(o, opts?.indent ?? 0, "", serializationOpts)
			)
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		default:
			return serializePrimitive(data as SerializablePrimitive)
	}
}

// errors print an object by its kind, so its contents never reach a message
export const printKind = (data: unknown): string =>
	typeof data === "function" ? "a function"
	: typeof data === "symbol" ? printSymbol(data)
	: typeof data !== "object" || data === null ?
		serializePrimitive(data as SerializablePrimitive)
	: isArray(data) ? "an array"
	: "an object"

const stringifyUnquoted = (
	value: unknown,
	indent: number,
	currentIndent: string,
	opts: SerializationOptions
): string => {
	if (typeof value === "function") return printableOpts.onFunction(value)
	if (typeof value === "symbol") return printableOpts.onSymbol(value)
	if (typeof value !== "object" || value === null)
		return serializePrimitive(value as never)

	const nextIndent = currentIndent + " ".repeat(indent)

	if (isArray(value)) {
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

export const printSymbol = (symbol: symbol): string =>
	`Symbol(${baseNameOfSymbol(symbol)})`

// private use character that JSON.stringify leaves unescaped
const unquotedMarker = "\uE000"

const printableOpts = {
	onCycle: () => "(cycle)",
	onSymbol: printSymbol,
	onFunction: v => `Function(${baseNameOf(v)})`,
	// prefix bigints and undefined with a marker so printable can strip the
	// quotes JSON.stringify adds, e.g. [1n, undefined] not ["1n", "undefined"]
	onBigInt: n => `${unquotedMarker}${n}n`,
	onUndefined: `${unquotedMarker}undefined`
} satisfies SerializationOptions

const ownDataPrintableOpts = /* @__PURE__ */ Object.assign({}, printableOpts, {
	onAccessor: (descriptor: PropertyDescriptor) =>
		descriptor.get ? "(getter)" : "(setter)"
}) satisfies SerializationOptions

const quotedMarkedValue = /"\uE000(-?\d+n|undefined)"/g

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
			if (isArray(o)) return o.map(item => _serialize(item, opts, nextSeen))

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

	// a bare year would read as the whole year, so it's never collapsed past
	// its day
	if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0)
		return `${months[month]} ${dayOfMonth}, ${year}`

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

// cached, since the same keys recur
const dotAccessibleKeys = new Map<string, boolean>()

export const isDotAccessible = (keyName: string): boolean => {
	let accessible = dotAccessibleKeys.get(keyName)
	if (accessible === undefined) {
		accessible = /^[$A-Z_a-z][\w$]*$/.test(keyName)
		// bounded, since keys can come from data
		if (keyName.length <= 64) {
			if (dotAccessibleKeys.size === 1024) dotAccessibleKeys.clear()
			dotAccessibleKeys.set(keyName, accessible)
		}
	}
	return accessible
}

export const baseNameOf = (value: object | symbol): string => {
	switch (typeof value) {
		case "object": {
			if (value === null) break

			const prefix = objectKindOf(value) ?? "object"
			// convert to camelCase
			return prefix[0].toLowerCase() + prefix.slice(1)
		}
		case "function":
			const name = functionNameOf(value)
			return isDotAccessible(name) ? name : "fn"
		case "symbol":
			return baseNameOfSymbol(value)
	}
	return throwInternalError(
		`Unexpected attempt to register serializable value of type ${domainOf(
			value
		)}`
	)
}

const baseNameOfSymbol = (symbol: symbol): string =>
	symbol.description && isDotAccessible(symbol.description) ?
		symbol.description
	:	"symbol"
