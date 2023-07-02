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

console.log(types.user.root.alias)

const name = types.user.root.getPath("name")

console.log(name.alias)

const nestedUser = types.user.root.getPath("friends", arrayIndexTypeNode())

console.log(nestedUser.alias)

console.log()

console.log(format(types.user.condition, { parser: "typescript" }))
