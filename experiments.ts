// @ts-ignore
import { format } from "prettier"
import { scope } from "./src/main.js"

const $ = scope({
    user: {
        friends: "user[]",
        name: "string[]"
    }
})

const node = (...args: any[]) => args
const type = node

const t = node({
    basis: "string"
})

const types = $.export()

console.log($.compile())

console.log(format(types.user.condition, { parser: "typescript" }))
