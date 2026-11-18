import { generic, type } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

const Even = type("number").narrow(isEven)

const Box = generic(["t", "number"])({ n: ["t", "=", 3] })

// the build instantiates the Generic here first, though the program never calls it
export const unused = () => Box(Even)

export const Omitted = Box(Even).omit("n")
