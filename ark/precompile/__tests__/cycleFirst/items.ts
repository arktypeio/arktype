import { scope, type } from "arktype"
import { calledFirst } from "./callFirst.ts"

// the cycle calls each before this module's body declares what it reads
const Base = type({ a: "string" })
export function and() {
	return Base.and({ b: "number" })
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

export const items = calledFirst
