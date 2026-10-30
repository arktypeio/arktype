import "./config.ts"
import { type } from "arktype"

const isLong = (s: string) => s.length > 3

export const Long = type("string").narrow(isLong)

console.log(JSON.stringify([Long.description, Long("ab")?.toString()]))
