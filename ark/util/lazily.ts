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

/**
 * defines `k` as a getter computing `thunk` once and then holding its result.
 * A result `isFinal` rejects is returned without being held, so the next read
 * computes it again, e.g. a placeholder for an alias still resolving
 */
export const defineLazily = <k extends PropertyKey>(
	o: object,
	k: k,
	thunk: (k: k) => unknown,
	isFinal?: (result: unknown) => boolean
): void => {
	let result: unknown = unset
	Object.defineProperty(o, k, {
		get() {
			if (result === unset) {
				const computed = thunk(k)
				if (isFinal && !isFinal(computed)) return computed
				result = computed
			}
			if (Object.getOwnPropertyDescriptor(this, k)?.configurable)
				defineValue(this, k, result)
			return result
		},
		enumerable: true,
		configurable: true
	})
}
