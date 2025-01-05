import { attest } from "@ark/attest"
import { flatMorph } from "@ark/util"
import { ark, type } from "arktype"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }

// false
// const t = type({ foo: "string" }).extends("Record<string, string>")

flatMorph(ark.internal.resolutions, (k, v) => [k, v])

console.log(Object.keys(ark.internal.resolutions))

const customEven = type("number % 2", "@", {
	expected: ctx => `custom expected ${ctx.description}`,
	actual: data => `custom actual ${data}`,
	problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
	message: ctx => `custom message ${ctx.problem}`
})

// custom message custom problem custom expected a multiple of 2 custom actual 3
customEven(3)
