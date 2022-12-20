import { type } from "./exports.js"

const a = type("string")
const b = a.assert({ a: "b" })
console.log(b)
