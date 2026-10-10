import { type } from "arktype"

let max = 10

const atMost = (n: number) => {
	const limit = max
	return n <= limit
}

export const First = type({ a: type("number").narrow(atMost).default(5) })

max = 1

// arktype checks the default each time `.default()` runs, before the property it creates checks it again
export const Second = type({ b: type("number").narrow(atMost).default(5) })
