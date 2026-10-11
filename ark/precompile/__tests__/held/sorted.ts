import { type } from "arktype"

const isEven = (n: number) => n % 2 === 0

const Small = type("number").narrow(function isSmall(n: number) {
	return n < 10
})

// arktype sorts the branches by their predicates' names, which the factory sorts the functions it receives by too
export const SmallOrEven = Small.or(type("number").narrow(isEven))

// a predicate of 2 parameters is passed a context where one of 1 isn't, so the build won't bind either in place of the other
export const SmallOrContextual = Small.or(
	type("number").narrow((n: number, ctx) => n % 2 === 0 || ctx.mustBe("even"))
)
