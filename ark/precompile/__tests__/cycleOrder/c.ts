import { type } from "arktype"
import { viaD } from "./d.ts"

console.log("c.ts runs")

// on no import cycle, so the import of e.ts it receives `h` through runs nothing earlier
export const c = type(viaD()).expression
