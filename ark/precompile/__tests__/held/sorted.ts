import { type } from "arktype"

const isEven = (n: number) => n % 2 === 0

const Small = type("number").narrow(function isSmall(n: number) {
	return n < 10
})

// arktype sorts the branches by their predicates' names, which the factory sorts the functions it receives by too
export const SmallOrEven = Small.or(type("number").narrow(isEven))
