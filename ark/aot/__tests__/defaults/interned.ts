import { type } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

export const Kept = type({ a: [["number", ":", isEven], "=", 4] }).omit("a")

// arktype returns the Type it created for Kept, after checking a default Kept never reached
export const Dropped = type({ a: [["number", ":", isEven], "=", 3] }).omit("a")
