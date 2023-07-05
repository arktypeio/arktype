// @ts-ignore
import { scope } from "./src/main.js"
import { arrayIndexTypeNode } from "./src/nodes/composite/indexed.js"

// TODO: reduce this case or create an issue
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

types.admin.root.alias //?

const result = types.user.root.getPath("friends", arrayIndexTypeNode())

result.alias //?

$.compile() //?
