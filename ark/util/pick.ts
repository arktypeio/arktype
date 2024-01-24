export const pick = <o extends object, keys extends readonly (keyof o)[]>(
	o: o,
	keys: keys
) =>
	keys.reduce(
		(result, k) => {
			if (k in o) {
				result[k] = o[k]
			}
			return result
		},
		{} as Pick<o, keys[number]>
	)
