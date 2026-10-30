import { type } from "arktype"
import { b } from "./b.ts"
import { h } from "./e.ts"

console.log("a.ts runs", b)

// on an import cycle with b.ts, so it receives `h` through its own import of e.ts
export const a = type(h({ b: "number" })).expression
