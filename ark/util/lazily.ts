export const lazily = <t extends object>(thunk: () => t): t => {
	let cached: any
	return new Proxy<t>({} as t, {
		get: (_, prop) => {
			if (!cached) 
				cached = thunk()
			
			return cached[prop as keyof t]
		},
		set: (_, prop, value) => {
			if (!cached) 
				cached = thunk()
			
			cached[prop] = value
			return true
		}
	})
}
