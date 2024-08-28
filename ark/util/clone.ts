import { objectKindOf, type BuiltinObjectKind } from "./objectKinds.ts"
import type { keySet } from "./records.ts"

/** Shallowly copy the properties and prototype of the object.
 *
 * NOTE: this still cannot guarantee arrow functions attached to the object
 * are rebound in case they reference `this`.
 *
 * See: https://x.com/colinhacks/status/1818422039210049985
 */
export const shallowClone: <input extends object>(
	input: input
) => input = input => _clone(input, null)

/** Deeply copy the properties and prototype of the object.
 *
 * NOTE: this still cannot guarantee arrow functions attached to the object
 * are rebound in case they reference `this`.
 *
 * See: https://x.com/colinhacks/status/1818422039210049985
 */
export const deepClone = <input extends object>(input: input): input =>
	_clone(input, new Map())

const deepClonableObjectKind: keySet<BuiltinObjectKind> = {
	Array: 1,
	Set: 1,
	WeakSet: 1,
	Map: 1,
	WeakMap: 1
}

const _clone = (input: unknown, seen: Map<unknown, unknown> | null): any => {
	if (typeof input !== "object" || input === null) return input
	if (seen?.has(input)) return seen.get(input)

	const builtinConstructorName = objectKindOf(input)

	if (
		builtinConstructorName &&
		!deepClonableObjectKind[builtinConstructorName]
	) {
		if (builtinConstructorName === "Date")
			return new Date((input as Date).getTime())

		return input
	}

	const cloned =
		Array.isArray(input) ?
			input.slice()
		:	Object.create(Object.getPrototypeOf(input))

	const propertyDescriptors = Object.getOwnPropertyDescriptors(input)

	if (seen) {
		seen.set(input, cloned)
		for (const k in propertyDescriptors)
			propertyDescriptors[k].value = _clone(propertyDescriptors[k].value, seen)
	}

	Object.defineProperties(cloned, propertyDescriptors)

	if (builtinConstructorName === "Set" || builtinConstructorName === "WeakSet")
		for (const item of input as Set<unknown>) cloned.add(_clone(item, seen))
	else if (
		builtinConstructorName === "Map" ||
		builtinConstructorName === "WeakMap"
	) {
		for (const [k, v] of input as Map<unknown, unknown>)
			cloned.set(k, _clone(v, seen))
	}

	return cloned
}
