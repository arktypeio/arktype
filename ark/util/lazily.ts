import { cached } from "./functions.ts"
import { defineValue } from "./records.ts"

export const lazily = <t extends object>(thunk: () => t): t => {
	let result: any
	return new Proxy<t>({} as t, {
		get: (_, prop) => {
			if (!result) result = thunk()

			return result[prop as keyof t]
		},
		set: (_, prop, value) => {
			if (!result) result = thunk()

			result[prop] = value
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
			if (Object.getOwnPropertyDescriptor(this, k)?.configurable)
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
