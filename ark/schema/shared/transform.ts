import {
	flatMorph,
	hasDomain,
	isArray,
	objectKindOf,
	typedArrayConstructors,
	type BuiltinObjectKind,
	type Key
} from "@ark/util"
import type { ArkErrorResult } from "./errors.ts"

export class TransformErrors {
	entries: TransformErrors.Entry[]

	constructor(result: ArkErrorResult, data: unknown) {
		this.entries = [{ reversedPath: [], result, data }]
	}

	addTo(
		gathered: TransformErrors | undefined,
		key?: PropertyKey
	): TransformErrors {
		if (key !== undefined)
			for (const entry of this.entries) entry.reversedPath.push(key)
		if (!gathered) return this
		gathered.entries.push(...this.entries)
		return gathered
	}
}

export declare namespace TransformErrors {
	export interface Entry {
		reversedPath: PropertyKey[]
		result: ArkErrorResult
		data: unknown
	}
}

export const copyOf = (data: object): object => {
	if (isArray(data)) return data.slice()
	const prototype = Object.getPrototypeOf(data)
	if (prototype === Object.prototype) return { ...data }
	const kind = objectKindOf(data)
	if (kind === undefined) return Object.setPrototypeOf({ ...data }, prototype)
	const copyContents = copyContentsOf[kind]
	// a builtin whose state can't be copied, e.g. a function, transforms in place
	if (!copyContents) return data
	const copy = Object.setPrototypeOf(copyContents(data as never), prototype)
	// like an array's, a typed array's copy takes only its elements
	if (kind in typedArrayConstructors) return copy
	// descriptors include state a spread skips, e.g. an Error's message
	const descriptors: { [k: Key]: PropertyDescriptor } =
		Object.getOwnPropertyDescriptors(data)
	for (const k of Reflect.ownKeys(descriptors)) {
		descriptors[k].configurable = true
		if ("value" in descriptors[k]) descriptors[k].writable = true
	}
	return Object.defineProperties(copy, descriptors)
}

// the later output wins a key both changed
export const mergeTransformed = (
	input: unknown,
	l: unknown,
	r: unknown
): unknown => {
	if (Object.is(r, input)) return l
	if (
		!hasDomain(input, "object") ||
		!hasDomain(l, "object") ||
		!hasDomain(r, "object") ||
		r instanceof TransformErrors
	)
		return r
	const merged: any = copyOf(l)
	for (const k in input) if (!(k in r)) delete merged[k]
	for (const k in r) {
		if (!(k in input) || !Object.is(r[k as never], input[k as never]))
			merged[k] = r[k as never]
	}
	return merged
}

const copyContentsOf: {
	[kind in BuiltinObjectKind]?: (data: never) => object
} = {
	...flatMorph(typedArrayConstructors, (kind, TypedArray) => [
		kind,
		(data: never) => new TypedArray(data)
	]),
	ArrayBuffer: (data: ArrayBuffer) => data.slice(0),
	Date: (data: Date) => new Date(data),
	Error: () => new Error(),
	Headers: (data: Headers) => new Headers(data),
	Map: (data: Map<unknown, unknown>) => new Map(data),
	RegExp: (data: RegExp) => new RegExp(data),
	Set: (data: Set<unknown>) => new Set(data),
	URL: (data: URL) => new URL(data)
}
