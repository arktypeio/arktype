import { scope, type } from "arktype"
import { calledFirst } from "./callFirst.ts"
// runs after callFirst.ts, which calls leaf() first
import { Leaf } from "./leaf.ts"

// the cycle calls each before this module's body declares what it reads
const Base = type({ a: "string" })
export function and() {
	return Base.and({ b: "number" })
}
// runs the fold once what it reads is set
export const anded = and().expression
// folded where it's called, in another module
export function extend(extra: object) {
	return Base.and(extra)
}

const $ = scope({ x: "string" })
export function scoped() {
	return $.type("x[]")
}

export const M = type.module({ a: "number" })
export function member() {
	return M.a
}

const E = type({ e: "number" })
export function json() {
	return E.json
}

export function leaf() {
	return Leaf.json
}

export const items = calledFirst
