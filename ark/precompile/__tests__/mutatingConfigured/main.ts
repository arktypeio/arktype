import "./config.ts"
import { type } from "arktype"

export const User = type({ name: "string.trim", role: "string = 'user'" })

const input = { name: " a " }
const out = User(input)

console.log(JSON.stringify([out, out === input, input]))
