import { type } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

// the build creates the property here first, though the program never calls it
export const unused = () => type({ a: [["number", ":", isEven], "=", 3] })

export const Picked = type({
	x: ["number", ":", isEven],
	a: [["number", ":", isEven], "=", 3]
}).pick("x")
