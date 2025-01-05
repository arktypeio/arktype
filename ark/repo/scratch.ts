import { attest } from "@ark/attest"
import { flatMorph } from "@ark/util"
import { ark, type } from "arktype"
import { jsDocgen } from "./jsDocgen.ts"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }

const t = type({ name: "string" })

// jsDocgen()
