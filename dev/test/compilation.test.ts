// import { describe, it } from "mocha"
import { format } from "prettier"
import { type } from "../../src/main.ts"
// import { attest } from "../attest/main.ts"

// describe("compilation", () => {
//     it("compiles", () => {
//         const t = type("string")
//         attest(t.js).snap([
//             'typeof data === "string" || !state.problems.addNew("domain", "string", { path: []})'
//         ])
//         attest(t.check("foo")).snap({ data: "foo" })
//         attest(t.check(5).problems?.summary)R.snap()
//     })
// })

const t = type("string[]")

console.log(t.steps)

const source = format(t.js)

console.log(source)

console.log(t([""]))

console.log(type("number%2").steps)

console.log(type({ a: "string", b: "boolean" }).steps)

let n, result
result = ((n = 5), n + 1)

console.log((n = 5))

console.log(result)
