import { type } from "arktype"

let max = 10

const atMost = (n: number) => {
	const limit = max
	return n <= limit
}

export const Single = type([[["number", ":", atMost], "=", 5]])

max = 1

// arktype creates this tuple's sequence and checks its default, though Single's sequence holds the same element
export const Pair = type(["string", [["number", ":", atMost], "=", 5]])
