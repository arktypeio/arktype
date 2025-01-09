import { type } from "arktype"
import { Disjoint } from "../schema/shared/disjoint.ts"
import { buildApi, jsDocGen } from "./jsDocGen.ts"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }
console.log(2 ** 100)

const t = type("number > 10").intersect("number < 5")
const n = type.raw(`${Math.random()}`)

const ez = n.ifEquals("0.5")

const tt = type(Math.random() > 0.5 ? "1" : "0")
