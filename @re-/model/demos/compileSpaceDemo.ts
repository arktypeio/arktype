import { compile } from "@re-/model"

// @snipStart id=whole
// @snipStatement id=space
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

// @snipStart id=type
// Even recursive and cyclic types are precisely inferred
type User = typeof space.types.user
// @snipEnd id=type

// Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
space.models.user.assert({
    name: "Devin Aldai",
    bestFriend: {
        name: "Devin Olnyt",
        groups: [{ title: "Type Enjoyers" }]
    },
    groups: []
})
// @snipEnd id=whole
