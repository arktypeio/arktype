import { type } from "arktype"

console.log("e.ts runs")

const T = type({ e: "string" })

export function h(extra: object) {
	return T.and(extra)
}
