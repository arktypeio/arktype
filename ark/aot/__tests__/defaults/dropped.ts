import { type } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

// arktype checks the default as it creates the property, which the result then drops
export const Dropped = type({ a: [["number", ":", isEven], "=", 3] }).omit("a")
