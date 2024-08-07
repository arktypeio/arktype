/** Shallowly copy the properties and prototype of the object.
 *
 * NOTE: this still cannot guarantee arrow functions attached to the object
 * are rebound in case they reference `this`.
 *
 * See: https://x.com/colinhacks/status/1818422039210049985
 */
export const shallowClone = <input extends object>(input: input): input => {
	const cloned = Object.create(
		Object.getPrototypeOf(input),
		Object.getOwnPropertyDescriptors(input)
	)

	return cloned
}

export const deepClone = <input>(input: input): input =>
	_deepClone(input, new Map())

const _deepClone = <input>(input: input, seen: Map<any, any>): input => {
	if (typeof input !== "object" || input === null) return input

	if (seen.has(input)) return seen.get(input)

	const cloned =
		Array.isArray(input) ?
			// ensure arrays are copied with their original class attached so they
			// work with Array.isArray
			input.slice()
		:	Object.create(Object.getPrototypeOf(input))

	seen.set(input, cloned)

	const propertyDescriptors = Object.getOwnPropertyDescriptors(input)

	for (const key of Object.keys(propertyDescriptors)) {
		propertyDescriptors[key].value = _deepClone(
			propertyDescriptors[key].value,
			seen
		)
	}

	Object.defineProperties(cloned, propertyDescriptors)

	return cloned
}
