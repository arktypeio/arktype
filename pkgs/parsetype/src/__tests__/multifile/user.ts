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
