import { getBuiltinNameOfConstructor, isArray } from "./objectKinds.ts"

/** Shallowly copy the properties of the object. */
export const shallowClone: <input extends object>(
	input: input
) => input = input => _clone(input, null)

/** Deeply copy the properties of the a non-subclassed Object, Array or Date.*/
export const deepClone = <input extends object>(input: input): input =>
	_clone(input, new Map())

const _clone = (input: unknown, seen: Map<unknown, unknown> | null): any => {
	if (typeof input !== "object" || input === null) return input
	if (seen?.has(input)) return seen.get(input)

	const builtinConstructorName = getBuiltinNameOfConstructor(input.constructor)

	if (builtinConstructorName === "Date")
		return new Date((input as Date).getTime())

	const inputIsArray = isArray(input)

	// Anything else with its own toString tag is a builtin, a host object or a
	// subclass of one (Map, URL, a typed array, DataView, Temporal.Instant,
	// including those from another realm or a polyfill). Their state lives in
	// internal slots a property copy can't carry, so the copy would throw
	// "incompatible receiver" on its first method call
	// (https://github.com/arktypeio/arktype/issues/1719). Return them as is,
	// the same rule copyOf in @ark/schema's transform.ts follows.
	// An ordinary class instance is tagged [object Object], so it is still
	// copied with its prototype. One that keeps state in #private fields can't
	// be told apart and still breaks.
	if (
		!inputIsArray &&
		Object.prototype.toString.call(input) !== "[object Object]"
	)
		return input

	const cloned =
		inputIsArray ? input.slice() : Object.create(Object.getPrototypeOf(input))

	const propertyDescriptors = Object.getOwnPropertyDescriptors(input)

	if (seen) {
		seen.set(input, cloned)
		for (const k in propertyDescriptors) {
			const desc = propertyDescriptors[k]

			if ("get" in desc || "set" in desc) continue
			desc.value = _clone(desc.value, seen)
		}
	}

	Object.defineProperties(cloned, propertyDescriptors)

	return cloned
}
