import { defineValue, hasDomain, hasOwn, isArray, type Key } from "@ark/util"
import type { BaseNode, RootApply } from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { ArkErrors } from "./issues.ts"
import type { RootApplyRuntime } from "./rootApply.ts"
import type { InternalTraversal, TraverseTransform } from "./traversal.ts"

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

// the object written in place each copy stands in for, while a union
// transforms data by more than one branch
let copiedInPlace: Map<object, object> | undefined

// the keys deleting undeclared ones reads
const deletableKeysOf = (data: object): (string | symbol)[] => [
	...Object.keys(data),
	...Object.getOwnPropertySymbols(data)
]

const isDeletableKeyOf = (data: object, k: string | symbol): boolean =>
	typeof k === "symbol" ?
		hasOwn(data, k)
	:	Object.prototype.propertyIsEnumerable.call(data, k)

export const copyOf = (data: object): object => {
	if (isArray(data)) {
		const copy: unknown[] = Array.prototype.slice.call(data)
		const keys = Object.keys(data)
		// an array's own keys list its indices first, which slice copies, and
		// are all the usual array holds. Each key one holds besides is defined
		// from its spread, which reads the enumerable own keys in their order,
		// as a value of its own. An empty array's is spread too, to no keys
		return (
				keys.length !== copy.length ||
					keys[copy.length - 1] !== `${copy.length - 1}` ||
					Object.getOwnPropertySymbols(data).length
			) ?
				Object.defineProperties(
					copy,
					Object.getOwnPropertyDescriptors({ ...data })
				)
			:	copy
	}
	const prototype = Object.getPrototypeOf(data)
	if (prototype === Object.prototype) return { ...data }
	// a copy standing in for an object written in place is written as it is
	if (copiedInPlace?.has(data)) return data
	// a builtin keeps state in internal slots, so it's written in place. Each
	// has its own toString tag, as does a host object, where a class instance
	// is tagged Object
	if (Object.prototype.toString.call(data) === "[object Object]")
		return Object.setPrototypeOf({ ...data }, prototype)
	if (!copiedInPlace) return data
	// each branch of a union joining what they keep writes a copy of the keys
	// it could delete, which the union writes from once it has joined them.
	// Without a prototype, the copy is passed here again rather than spread
	const copy = Object.create(null)
	for (const k of deletableKeysOf(data)) copy[k] = data[k as never]
	copiedInPlace.set(copy, data)
	return copy
}

/**
 * what a union whose branches delete different undeclared keys makes of data
 * more than one of them allows: each transforms it, and a key is kept where
 * any of them keeps it, so the order they're checked in decides nothing.
 * `transforms` are those of the branches allowing data, each called on its
 * node where it's passed one
 */
export const transformKept = (
	data: unknown,
	ctx: InternalTraversal | undefined,
	transforms: readonly TraverseTransform[],
	nodes?: readonly BaseNode[]
): unknown => {
	// one branch alone writes an object it can't copy in place, as it would
	// outside a union
	if (transforms.length === 1)
		return transforms[0].call(nodes?.[0], data, ctx as never)
	const outer = copiedInPlace
	const copied = (copiedInPlace ??= new Map())
	try {
		let out = data
		for (let i = 0; i < transforms.length; i++) {
			const kept = transforms[i].call(nodes?.[i], data, ctx as never)
			// one that deleted nothing kept all the others do
			if (kept === data) return data
			out = i === 0 ? kept : joinKept(data, out, kept)
		}
		// transformed in a branch of another such union, it leaves the copies
		// for that one to write, once it has joined its own branches
		return outer || !copied.size ? out : writeCopied(data, out, copied)
	} finally {
		copiedInPlace = outer
	}
}

// writes each copy standing in for an object written in place into it: the
// keys every branch reaching it deleted are deleted from it, and it takes the
// copy's place. Only a copy holds one, so what out holds as data does is
// passed over
const writeCopied = (
	data: any,
	out: any,
	copied: Map<object, object>
): unknown => {
	const inPlace: any = copied.get(out)
	// what a getter returns anew isn't the object out is a copy of
	if (inPlace) data = inPlace
	for (const k of deletableKeysOf(out)) {
		const held = data[k]
		let made = out[k]
		if (Object.is(made, held)) continue
		if (hasDomain(made, "object") && hasDomain(held, "object")) {
			const written = writeCopied(held, made, copied)
			if (written !== made) setOwnValue(out, k, (made = written))
		}
		// assigned as a branch alone would, unless the key was deleted for
		// another place the object is held, or is read anew each time, so that
		// no branch made its value
		if (
			inPlace &&
			k in inPlace &&
			!Object.is(made, held) &&
			Object.is(held, inPlace[k])
		)
			setOwnValue(inPlace, k, made)
	}
	if (!inPlace) return out
	for (const k of deletableKeysOf(inPlace))
		if (!hasOwn(out, k)) delete inPlace[k]
	return inPlace
}

// what two branches made of data both allow, each a copy without the keys it
// deleted. Written into l's, whose keys r's others follow
const joinKept = (data: any, l: any, r: any): unknown => {
	if (l === data || r === data) return data
	// a value neither copied, which a getter returned each its own of
	if (!hasDomain(l, "object") || !hasDomain(r, "object")) return l
	// a branch alone leaves a key deleting doesn't read, like an Error's cause,
	// as an object written in place holds it unless it transforms its value.
	// So the copies of such an object keep one only where each of them holds it
	const inPlace = copiedInPlace?.get(l)
	for (const k of deletableKeysOf(r)) {
		const kept = r[k]
		if (!hasOwn(l, k)) {
			if (inPlace && !isDeletableKeyOf(inPlace, k)) continue
			// a key l's copy inherits, as from an accessor of its class, is
			// defined: assigning it would call a setter, or throw without one
			if (k in l) defineValue(l, k, kept)
			else l[k] = kept
			continue
		}
		const held = l[k]
		if (Object.is(held, kept)) continue
		const joined = joinKept(data[k], held, kept)
		// joined where it's held, unless r kept all data holds there. Nothing
		// is assigned otherwise, as what a getter returned each branch anew
		// is neither's copy to write
		if (joined !== held) setOwnValue(l, k, joined)
	}
	if (inPlace) {
		for (const k of deletableKeysOf(l))
			if (!hasOwn(r, k) && !isDeletableKeyOf(inPlace, k)) delete l[k]
	}
	return l
}

export const setOwnValue = (
	out: object,
	k: PropertyKey,
	value: unknown
): void => {
	"use strict"
	// an inherited key can be an accessor (like __proto__ or a class getter/setter)
	// or a non-writable data property on a frozen prototype, so define an own value
	if (k in out && !hasOwn(out, k)) defineValue(out, k, value)
	else out[k as never] = value as never
}

// keeps data's own key on its copy where the spread skipped it, as a
// non-enumerable one. A key data inherits is reachable through the copy's
// prototype, which copyOf keeps, so `in` rejects the usual key at once
export const keepOwn = (out: object, data: object, k: Key): void => {
	if (!(k in out) && hasOwn(data, k)) setOwnValue(out, k, data[k as never])
}

/**
 * what deleting undeclared keys makes of data other than a plain object, a copy
 * keeping its prototype: what its values transformed to, flat as
 * [key, value, output], then without the keys it doesn't declare
 */
export const copyDeclared = (
	data: object,
	declared: readonly Key[],
	changes?: readonly unknown[]
): object => {
	"use strict"
	let out = data
	if (changes) {
		for (let i = 0; i < changes.length; i += 3) {
			if (Object.is(changes[i + 2], changes[i + 1])) continue
			if (out === data) out = copyOf(data)
			setOwnValue(out, changes[i] as Key, changes[i + 2])
		}
		if (out !== data) for (const k of declared) keepOwn(out, data, k)
	}
	for (const k of [
		...Object.keys(data),
		...Object.getOwnPropertySymbols(data)
	]) {
		if (declared.includes(k)) continue
		if (out === data) out = copyOf(data)
		delete out[k as never]
	}
	return out
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
			setOwnValue(merged, k, r[k as never])
	}
	return merged
}
