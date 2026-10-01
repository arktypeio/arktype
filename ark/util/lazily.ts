import { unset } from "./records.ts"

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
	compute: () => unknown
): void => {
	let result: unknown = unset
	Object.defineProperty(o, k, {
		get() {
			if (result === unset) result = compute()
			const descriptor = Object.getOwnPropertyDescriptor(this, k)
			if (descriptor ? descriptor.configurable : Object.isExtensible(this)) {
				Object.defineProperty(this, k, {
					value: result,
					enumerable: true,
					writable: true,
					configurable: true
				})
			}
			return result
		},
		enumerable: true,
		configurable: true
	})
}
