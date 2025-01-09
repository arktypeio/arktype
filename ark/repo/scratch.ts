import { type } from "arktype"
import { buildApi, jsDocGen } from "./jsDocGen.ts"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }
console.log(2 ** 100)

const stillOkay = type("string > 5", "=>", Number.parseFloat).or([
	"string < 10",
	"=>",
	Number.parseFloat
])

console.log(stillOkay)
// buildApi()

const prop = type({ foo: "number" })
const state = type({ count: type.number.default(0) })
const forObj = type({
	key: type({ nested: "boolean" }).default(() => ({ nested: false }))
})

const t = type("string").brand("id")

const palindrome = type("string")
	.narrow(s => s === [...s].reverse().join(""))
	.brand("palindrome")

const stringifyUser = type({ name: "string" }).pipe(user =>
	JSON.stringify(user)
)

const parseZDate = type("string.date.parse").filter((s): s is `${string}Z` =>
	s.endsWith("Z")
)

new Date().getFullYear()

const withPredicate = type("string").narrow((s): s is `${string}.tsx` =>
	/\.tsx?$/.test(s)
)
