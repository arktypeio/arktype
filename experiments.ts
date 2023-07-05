// @ts-ignore
import { scope } from "./src/main.js"
import { arrayIndexTypeNode } from "./src/nodes/composite/indexed.js"

const $ = scope({
    user: {
        friends: "user[]",
        name: "string"
    },
    admin: {
        friends: "user[]",
        name: "string"
    }
})

const types = $.export()

types.user.root.alias //?

types.user.root.condition //?

types.admin.root.alias //?

types.admin.root.condition //?

const result = types.user.root.getPath("friends", arrayIndexTypeNode())

result.alias //?

$.compile() //?
