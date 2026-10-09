import "./config.ts"
import { type } from "arktype"

const lenient = process.env.MODE === "lenient"

export const T = type("string").narrow(() => lenient)

console.log(JSON.stringify([T.description, T(5)?.toString()]))
