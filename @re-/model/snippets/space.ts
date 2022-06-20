import { compile } from "../src/index.js"

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
// @snipStart:validatingASpace
const data = {
    name: "Devin Aldai",
    bestFriend: {
        name: "Devin Olnyt",
        groups: [{ title: "Type Enjoyers" }]
    },
    groups: []
}

// Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
space.models.user.assert(data)
// @snipEnd:validatingASpace
