// @ts-nocheck
import { format } from "prettier"
import { arkKind } from "./src/compile/registry.js"
import { scope, type } from "./src/main.js"

const $ = scope({
    user: {
        friends: "user[]"
    }
})

const result = $.compile()

console.log(format(result, { parser: "typescript" }))
