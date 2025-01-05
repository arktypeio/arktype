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

jsDocgen()

// const src =
// 	"\tonUndeclaredKey(behavior: UndeclaredKeyBehavior): this\n" +
// 	"\t/**\n" +
// 	"     * Deeply clone to a new Type with the specified undeclared key behavior. **/\n" +
// 	"     *\n" +
// 	"     * How to handle undeclared object keys on data passed to a Type.\n" +
// 	"     *\n"

// console.log(src)
