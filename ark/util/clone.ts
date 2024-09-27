import { getBuiltinNameOfConstructor } from "./objectKinds.ts"

/** Shallowly copy the properties of the object. */
export const shallowClone: <input extends object>(
	input: input
) => input = input => _clone(input, null)

/** Deeply copy the properties of the a non-subclassed Object, Array or Date.
 *
 * @param input The object to clone
 *
 * @returns A new deeply cloned version of the object, or the original object
 * if it has a prototype other than Object, Array Date, or null.
 */
export const deepClone = <input extends object>(input: input): input =>
	_clone(input, new Map())

const _clone = (input: unknown, seen: Map<unknown, unknown> | null): any => {
	if (typeof input !== "object" || input === null) return input
	if (seen?.has(input)) return seen.get(input)

	const builtinConstructorName = getBuiltinNameOfConstructor(input.constructor)

	if (builtinConstructorName === "Date")
		return new Date((input as Date).getTime())

	// we don't try and clone other prototypes here since this we can't guarantee arrow functions attached to the object
	// are rebound in case they reference `this` (see https://x.com/colinhacks/status/1818422039210049985)
	if (builtinConstructorName && builtinConstructorName !== "Array") return input

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

	return cloned
}
