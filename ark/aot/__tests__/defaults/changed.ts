import { type } from "arktype"

let max = 10

const atMost = (n: number) => {
	const limit = max
	return n <= limit
}

export const Inner = type({ a: [["number", ":", atMost], "=", 5] })

max = 1

// arktype checked the default where it created Inner, so holding it checks nothing
export const Outer = type({ x: Inner })
