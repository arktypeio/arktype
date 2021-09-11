import { define } from "./types"

export const user = define.user({
    name: "string",
    bestFriend: "user",
    friends: "user[]",
    groups: "group[]",
    nested: {
        another: "string",
        user: "user[]"
    }
})

// export const userDefinition = m3.define("user")
