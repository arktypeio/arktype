import { type } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

const Even = type("number").narrow(isEven)

// the build intersects them here first, though the program never calls it
export const unused = () => type({ "a?": Even }).and({ a: ["number", "=", 3] })

export const Omitted = type({ "a?": Even })
	.and({ a: ["number", "=", 3] })
	.omit("a")
