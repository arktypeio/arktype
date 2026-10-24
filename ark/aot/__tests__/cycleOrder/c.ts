import { type } from "arktype"
import { viaD } from "./d.ts"

console.log("c.ts runs")

// on no import cycle, so importing `h` from e.ts runs nothing earlier
export const c = type(viaD()).expression
