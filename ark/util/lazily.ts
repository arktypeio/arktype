import { cached } from "./functions.ts"
import { defineValue } from "./records.ts"

export const lazily = <t extends object>(thunk: () => t): t => {
	let cached: any
	return new Proxy<t>({} as t, {
		get: (_, prop) => {
			if (!cached) cached = thunk()

			return cached[prop as keyof t]
		},
		set: (_, prop, value) => {
			if (!cached) cached = thunk()

			cached[prop] = value
			return true
		}
	})
}

export const defineLazily = (
	o: object,
	k: PropertyKey,
	thunk: () => unknown
): void => {
	const resolve = cached(thunk)
	Object.defineProperty(o, k, {
		get() {
			const result = resolve()
			const descriptor = Object.getOwnPropertyDescriptor(this, k)
			if (descriptor ? descriptor.configurable : Object.isExtensible(this))
				defineValue(this, k, result)
			return result
		},
		set(value) {
			defineValue(this, k, value)
		},
		enumerable: true,
		configurable: true
	})
}
