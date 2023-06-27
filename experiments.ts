// @ts-ignore
import { format } from "prettier"
import { scope } from "./src/main.js"

const $ = scope({
    user: {
        friends: "user[]"
    }
})

const result = $.compile()

console.log(format(result, { parser: "typescript" }))
