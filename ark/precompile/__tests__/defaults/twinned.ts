import { scope } from "arktype"

let max = 10

const atMost = (n: number) => {
	const limit = max
	return n <= limit
}

const first = scope({ n: "number" })
const second = scope({ n: "number" })

export const First = first.type({ a: [["n", ":", atMost], "=", 5] })

max = 1

// a Scope equal to first's still creates its own property, so arktype checks the default again
export const Second = second.type({ a: [["n", ":", atMost], "=", 5] })
