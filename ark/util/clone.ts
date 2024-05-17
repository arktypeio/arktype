export const shallowClone = <input extends object>(input: input): input =>
	Object.create(
		Object.getPrototypeOf(input),
		Object.getOwnPropertyDescriptors(input)
	)

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
