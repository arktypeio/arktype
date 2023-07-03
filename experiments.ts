// @ts-ignore
import { format } from "prettier"
import { scope } from "./src/main.js"
import { arrayIndexTypeNode } from "./src/nodes/composite/indexed.js"

const $ = scope({
    user: {
        friends: "user[]",
        name: "string[]"
    }
})

const types = $.export()

console.log($.compile())

console.log(format(types.user.condition, { parser: "typescript" }))

// /******** ArkType Metadata Operator *********/

// // The left - hand side of this operator will be used to add metadata like
// // custom error messages (doesn't affect type) or how keys are checked (does
// // affect type).

// // Would be available as a root expression, a tuple expression, and likely
// // chained as something like `.meta`, `.config`, or `.configure`

// // Option 1️⃣
// type("string", "@", { keys: "strict", description: "a string" })

// // Option 2️⃣
// type("string", "~", { keys: "distilled", description: "a string" })

// // Option 3️⃣
// type("string", "#", { keys: "loose", description: "a string" })
