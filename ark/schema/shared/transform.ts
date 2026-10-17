import {
	defineValue,
	hasDomain,
	hasOwn,
	isArray,
	objectKindOf
} from "@ark/util"
import type { BaseRoot } from "../roots/root.ts"
import { arrayIndexMatcher } from "../structure/shared.ts"
import type { ArkErrors } from "./issues.ts"
import type { rootApplyRuntime } from "./rootApply.ts"

// installed by arktype/mutatesInput, so a bundle without it only copies
export interface InPlaceTransforms {
	// whether a valid input's transforms write into it, as its Scope configures
	writes(root: BaseRoot): boolean
	// the root a compiled apply reads, transforming in place where its Scope can
	applied(root: BaseRoot): BaseRoot
	// what a jitless apply reads, transforming in place where its Scope can
	runtimeOf(
		root: BaseRoot,
		runtime: typeof rootApplyRuntime
	): typeof rootApplyRuntime
}

export class TransformErrors {
	entries: TransformErrors.Entry[]

	constructor(result: ArkErrors, data: unknown) {
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
		result: ArkErrors
		data: unknown
	}
}

// an array's own keys list its indices first, so it holds no others if its last is the index before its length
export const holdsOnlyIndices = (data: unknown[]): boolean => {
	const keys = Object.keys(data)
	return (
		keys.length === data.length &&
		(!keys.length || keys[keys.length - 1] === `${keys.length - 1}`) &&
		!Object.getOwnPropertySymbols(data).length
	)
}

export const copyOf = (data: object): object => {
	if (isArray(data)) {
		const keys = Object.keys(data)
		let i = keys.length
		// an array's named keys follow its indices, which are below its length
		if (keys[data.length - 1] === `${data.length - 1}`) i = data.length
		else {
			while (
				i > 0 &&
				!(arrayIndexMatcher.test(keys[i - 1]) && +keys[i - 1] < data.length)
			)
				i--
		}
		const copy: unknown[] = Array.prototype.slice.call(data)
		for (; i < keys.length; i++)
			defineValue(copy, keys[i], data[keys[i] as never])
		for (const k of Object.getOwnPropertySymbols(data)) {
			if (Object.prototype.propertyIsEnumerable.call(data, k))
				defineValue(copy, k, data[k as never])
		}
		return copy
	}
	const prototype = Object.getPrototypeOf(data)
	if (prototype === Object.prototype) return { ...data }
	// a builtin's state is in internal slots a copy can't take, so it's transformed in place
	return objectKindOf(data) === undefined ?
			Object.setPrototypeOf({ ...data }, prototype)
		:	data
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
	for (const k in input) if (!hasOwn(r, k)) delete merged[k]
	for (const k in r) {
		if (!(k in input) || !Object.is(r[k as never], input[k as never]))
			merged[k] = r[k as never]
	}
	return merged
}
