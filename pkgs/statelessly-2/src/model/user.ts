import { define } from "./model"
import { m3 } from "./types"

export const user = "user"

m3.define("user", {
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
