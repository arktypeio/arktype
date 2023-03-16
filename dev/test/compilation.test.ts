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

console.log(format(type("string[]").js))

console.log(format(t.js))

console.log(t([""]))

console.log(type("number%2").js)

console.log(type({ a: "string", b: "boolean" }).js)

let result, isValid

let n = 6

result =
    ((isValid = n > 5), (isValid = n < 10 && isValid), n % 2 === 0 && isValid)

console.log(result)

console.log((n = 5))

console.log(result)
