import { a } from "./a.ts"

console.log("b.ts runs")

export const b = "b"

export const later = () => a
