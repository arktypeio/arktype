// @ts-ignore
import { format } from "prettier"
import { arkKind } from "./src/compile/registry.js"
import { node, scope, type } from "./src/main.js"

const $ = scope({
    user: {
        friends: "user[]"
    }
})

const result = $.compile()

console.log(format(result, { parser: "typescript" }))
