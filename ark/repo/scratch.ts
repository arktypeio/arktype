import { attest } from "@ark/attest"
import { flatMorph, groupBy } from "@ark/util"
import { ark, type } from "arktype"
import { SyntaxKind, type JSDocableNode } from "ts-morph"
import { buildApi, getAllJsDoc } from "./jsdocGen.ts"
import { repoDirs } from "./shared.ts"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }

const t = type({ name: "string" })

buildApi()
