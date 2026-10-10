import { scope } from "arktype"

let max = 10

const atMost = (n: number) => {
	const limit = max
	return n <= limit
}

const isPositive = (n: number) => n > 0

const first = scope({ n: "number" }).type({ x: ["n", ":", isPositive] })
const second = scope({ n: "number" }).type({ x: ["n", ":", isPositive] })

export const First = first.and({ a: [["number", ":", atMost], "=", 5] })

max = 1

// `and` parses in second's Scope, which the site doesn't read, so arktype creates and checks the property again
export const Second = second.and({ a: [["number", ":", atMost], "=", 5] })
