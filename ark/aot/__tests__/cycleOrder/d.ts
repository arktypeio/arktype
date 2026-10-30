import { h } from "./e.ts"

console.log("d.ts runs")

export function viaD() {
	return h({ d: "number" })
}
