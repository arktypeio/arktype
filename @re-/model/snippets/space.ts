import { space } from "../src/index.js"

export const mySpace = space({
    user: {
        name: "string",
        bestFriend: "user?",
        groups: "group[]"
    },
    group: {
        title: "string",
        members: "user[]"
    }
})

// Even recursive and cyclic types are precisely inferred
export type User = typeof mySpace.types.user

const data = {
    name: "Devin Aldai",
    bestFriend: {
        name: "Devin Olnyt",
        groups: [{ title: "Type Enjoyers" }]
    },
    groups: []
}

// Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
mySpace.models.user.assert(data)
