import { type } from "arktype"
// only a type reads it, but the import runs callFirst.ts before this body
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { calledFirst } from "./callFirst.ts"

export type CalledFirst = typeof calledFirst

export function and() {
	return Base.and({ b: "number" })
}

const Base = type({ a: "string" })

export const items = "items"
