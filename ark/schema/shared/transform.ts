import { defineValue, hasDomain, hasOwn, isArray, type Key } from "@ark/util"
import type { BaseNode, RootApply } from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { ArkErrors } from "./issues.ts"
import type { RootApplyRuntime } from "./rootApply.ts"

// installed by arktype/mutatesInput, so a bundle without it only copies
export interface InPlaceTransforms {
	// whether root checks its first data uncompiled
	checksUncompiled(root: BaseRoot): boolean
	// root's uncompiled apply, or undefined to compile it
	checkedUncompiled(root: BaseRoot, apply: RootApply): RootApply | undefined
	// nodes the running uncompiled applies reach
	readonly checking: ReadonlySet<BaseNode> | undefined
	// root/runtime, writing in place where configured
	applied(root: BaseRoot): BaseRoot
	runtimeOf(root: BaseRoot, runtime: RootApplyRuntime): RootApplyRuntime
}

export class TransformErrors {
	declare entries: TransformErrors.Entry[]

	// a function, so a check can rule out other values by typeof
	constructor(result: ArkErrors, data: unknown) {
		const errors = Object.setPrototypeOf(() => {}, TransformErrors.prototype)
		errors.entries = [{ reversedPath: [], result, data }]
		return errors
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

// an array's own keys list its indices first
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
		const copy: unknown[] = Array.prototype.slice.call(data)
		const keys = Object.keys(data)
		// an array's own keys list its indices first, which slice copies
		if (
			keys.length !== copy.length ||
			keys[copy.length - 1] !== `${copy.length - 1}`
		) {
			for (const k of keys) {
				const index = +k >>> 0
				if (`${index}` !== k || index >= copy.length)
					defineValue(copy, k, data[k as never])
			}
		}
		for (const k of Object.getOwnPropertySymbols(data)) {
			if (Object.prototype.propertyIsEnumerable.call(data, k))
				defineValue(copy, k, data[k as never])
		}
		return copy
	}
	const prototype = Object.getPrototypeOf(data)
	if (prototype === Object.prototype) return { ...data }
	// a builtin keeps state in internal slots, so it's written in place. Each
	// has its own toString tag, as does a host object, where a class instance
	// is tagged Object
	return Object.prototype.toString.call(data) === "[object Object]" ?
			Object.setPrototypeOf({ ...data }, prototype)
		:	data
}

// keeps data's own key on its copy where the spread skipped it, as a
// non-enumerable one. A key data inherits is reachable through the copy's
// prototype, which copyOf keeps, so `in` rejects the usual key at once
export const keepOwn = (out: object, data: object, k: Key): void => {
	if (!(k in out) && hasOwn(data, k)) out[k as never] = data[k as never]
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
