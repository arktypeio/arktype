import { defineValue, unset } from "./records.ts"

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

export const defineLazily = <k extends PropertyKey>(
	o: object,
	k: k,
	thunk: (k: k) => unknown
): void => {
	let result: unknown = unset
	Object.defineProperty(o, k, {
		get() {
			if (result === unset) result = thunk(k)
			if (Object.getOwnPropertyDescriptor(this, k)?.configurable)
				defineValue(this, k, result)
			return result
		},
		enumerable: true,
		configurable: true
	})
}
