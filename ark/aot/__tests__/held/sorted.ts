import { type } from "arktype"

const isEven = (n: number) => n % 2 === 0

const Small = type("number").narrow(function isSmall(n: number) {
	return n < 10
})

// branches sort by predicate name, as the factory sorts what it receives
export const SmallOrEven = Small.or(type("number").narrow(isEven))

// a 2-parameter predicate gets a context a 1-parameter one doesn't
export const SmallOrContextual = Small.or(
	type("number").narrow((n: number, ctx) => n % 2 === 0 || ctx.mustBe("even"))
)
