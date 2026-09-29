import { getBuiltinNameOfConstructor } from "./objectKinds.ts"

/** Deeply copy the properties of the a non-subclassed Object, Array or Date.*/
export const deepClone = <input extends object>(input: input): input =>
	_clone(input, new Map())

const _clone = (input: unknown, seen: Map<unknown, unknown>): any => {
	if (typeof input !== "object" || input === null) return input
	if (seen.has(input)) return seen.get(input)

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

	// behaves as defining Object.getOwnPropertyDescriptors(input) on cloned,
	// after a deep clone has cloned their values in a for...in over them
	const keys = Reflect.ownKeys(input)
	const descriptors: (PropertyDescriptor | undefined)[] = []
	for (let i = 0; i < keys.length; i++)
		descriptors.push(Object.getOwnPropertyDescriptor(input, keys[i]))

	seen.set(input, cloned)
	for (let i = 0; i < keys.length; i++) {
		const desc = descriptors[i]
		if (desc && typeof keys[i] === "string") cloneValue(desc, seen)
	}
	// that for...in would also visit enumerable keys added to
	// Object.prototype that input doesn't shadow
	for (const k in withoutOwnKeys) {
		const i = keys.indexOf(k)
		if (i === -1 || !descriptors[i])
			cloneValue((withoutOwnKeys as any)[k], seen)
	}

	for (let i = 0; i < keys.length; i++) {
		const k = keys[i]
		const desc = descriptors[i]
		if (!desc) continue
		if (!("get" in desc || "set" in desc) && desc.writable) {
			// assigning defines a writable, enumerable, configurable value if k
			// is an element slice copied to a builtin array or is nowhere on
			// cloned's prototype chain
			if (
				desc.enumerable &&
				desc.configurable &&
				((builtinConstructorName === "Array" &&
					Object.prototype.hasOwnProperty.call(cloned, k)) ||
					!(k in cloned))
			) {
				cloned[k] = desc.value
				continue
			}
			// slice already copied this writable length, so defining it is a no-op
			if (
				k === "length" &&
				Array.isArray(cloned) &&
				desc.value === cloned.length
			)
				continue
		}
		Object.defineProperty(cloned, k, desc)
	}

	return cloned
}

// for...in over it visits only enumerable keys inherited from Object.prototype
const withoutOwnKeys = {}

const cloneValue = (
	desc: PropertyDescriptor,
	seen: Map<unknown, unknown>
): void => {
	if (!("get" in desc || "set" in desc)) desc.value = _clone(desc.value, seen)
}
