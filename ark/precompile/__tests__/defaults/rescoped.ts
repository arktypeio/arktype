import { scope } from "arktype"

let max = 10

const atMost = (n: number) => {
	const limit = max
	return n <= limit
}

export const First = scope({
	o: { a: [["number", ":", atMost], "=", 5] }
}).type("o")

max = 1

// each Scope creates its own property, so arktype checks the default again
export const Second = scope({
	o: { a: [["number", ":", atMost], "=", 5] }
}).type("o")
