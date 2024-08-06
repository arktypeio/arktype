import { type } from "arktype"

const parseJson = type("string").pipe.try((s): object => JSON.parse(s))

// ---cut---
// hover to see the type-level representation

// Uncaught Exception:
const badOut = parseJson('{ unquoted: "keys" }')

console.log(badOut.toString())
