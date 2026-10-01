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

	const isArray = Array.isArray(input)
	const proto = isArray ? null : Object.getPrototypeOf(input)
	const cloned = isArray ? input.slice() : Object.create(proto)
	const plainPrototype =
		!isArray && (proto === Object.prototype || proto === null)

	seen.set(input, cloned)
	for (const k of Reflect.ownKeys(input)) {
		const desc = Object.getOwnPropertyDescriptor(input, k)
		if (!desc) continue
		if (!("get" in desc || "set" in desc)) {
			if (typeof k === "string") desc.value = _clone(desc.value, seen)
			// assigning k defines the same property only if slice copied it or it is
			// absent from a plain prototype chain, which no Proxy can trap
			if (
				desc.writable &&
				desc.enumerable &&
				desc.configurable &&
				(plainPrototype ?
					!(k in cloned)
				:	builtinConstructorName === "Array" &&
					Object.prototype.hasOwnProperty.call(cloned, k))
			) {
				cloned[k] = desc.value
				continue
			}
			// slice already copied this writable length, so defining it is a no-op
			if (
				k === "length" &&
				desc.writable &&
				Array.isArray(cloned) &&
				desc.value === cloned.length
			)
				continue
		}
		Object.defineProperty(cloned, k, desc)
	}

	return cloned
}
