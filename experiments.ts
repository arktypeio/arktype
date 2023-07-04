// @ts-ignore
import { format } from "prettier"
import { scope, type } from "./src/main.js"

const $ = scope({
    user: {
        friends: "user[]",
        name: "string[]"
    }
})

const node = (...args: any[]) => args

type({ a: "string" })

const types = $.export()

console.log($.compile())

console.log(format(types.user.condition, { parser: "typescript" }))
