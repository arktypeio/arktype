import { compile } from "@re-/model"

const space = compile({
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
type User = typeof space.types.user

// Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
space.models.user.assert({
    name: "Devin Aldai",
    bestFriend: {
        name: "Devin Olnyt",
        groups: [{ title: "Type Enjoyers" }]
    },
    groups: []
})
