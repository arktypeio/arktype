import { type, type Type } from "arktype"
import { r } from "./r.ts"

// each runs once what it reads is set, before the statement setting it ends
export function make() {
	return Base.and({ b: "number" })
}
export const arrow = () => Base.and({ c: "number" })
export function fromPattern() {
	return Patterned.and({ d: "number" })
}
// throws a ReferenceError before Base is set, a ParseError after
export function contradict() {
	return Base.and({ a: "number" })
}

const contradictedFirst = r(() => contradict()),
	Base = type({ a: "string" }),
	contradicted = r(() => contradict()),
	made = r(() => make()),
	arrowed = r(() => arrow())
export const {
	Patterned = type({ p: "string" }),
	patterned = r(() => fromPattern())
}: {
	Patterned?: Type<{ p: string }>
	patterned?: string
} = {}

export const results = [
	contradictedFirst,
	contradicted,
	made,
	arrowed,
	patterned
]
