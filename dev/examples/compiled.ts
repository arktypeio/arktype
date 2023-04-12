// import { describe, it } from "mocha"
// @ts-ignore
import { format } from "prettier"
import { type } from "../../src/main.js"
// import { attest } from "../attest/main.ts"

const t = type({ a: "string[]" })

console.log(format(type({ a: "string[]" }).compiled))

console.log(format(t.compiled))

console.log(t([""]))

console.log(type("number%2").compiled)

console.log(type("number%2")(3).problems?.summary)

console.log(type({ a: "string", b: "boolean" }).compiled)

const o = type({ a: "string", b: "boolean" })

console.log(o({}))

let result, isValid

let n = 6

result =
    ((isValid = n > 5), (isValid = n < 10 && isValid), n % 2 === 0 && isValid)

console.log(result)

console.log((n = 5))

console.log(result)
