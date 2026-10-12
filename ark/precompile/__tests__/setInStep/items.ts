import { type, type Type } from "arktype"
import { viaOther, viaOtherPatterned } from "./other.ts"
import { r } from "./r.ts"

// each runs once what it reads is set, before the statement setting it ends
export function make() {
	return Base.and({ b: "number" })
}
export const arrow = () => Base.and({ c: "number" })
export function fromPattern() {
	return Patterned.and({ d: "number" })
}
// folded in other.ts
export function extend(extra: object) {
	return Base.and(extra)
}
export function extendPatterned(extra: object) {
	return Patterned.and(extra)
}

const Base = type({ a: "string" }),
	made = r(() => make()),
	arrowed = r(() => arrow()),
	extended = viaOther()
export const {
	Patterned = type({ p: "string" }),
	patterned = r(() => fromPattern()),
	patternedOther = viaOtherPatterned()
}: {
	Patterned?: Type<{ p: string }>
	patterned?: string
	patternedOther?: string
} = {}

export const results = [made, arrowed, extended, patterned, patternedOther]
