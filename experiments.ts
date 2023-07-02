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
