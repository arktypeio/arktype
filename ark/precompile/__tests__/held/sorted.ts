import { type } from "arktype"

const isSmall = (n: number) => n < 10
const isEven = (n: number) => n % 2 === 0

// arktype sorts the branches by their predicates' names, so the factory checks the functions it receives sort the same way
export const SmallOrEven = type("number")
	.narrow(isSmall)
	.or(type("number").narrow(isEven))
