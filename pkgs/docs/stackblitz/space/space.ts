import { compile } from "@re-/model"

// Map the names of your types to their definitions
export const space = compile({
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

export const userData = {
    name: "Devin Aldai",
    bestFriend: {
        name: "Devin Olnyt",
        groups: [{ title: "Type Enjoyers" }]
    },
    groups: []
}

// Try changing "space" or "userData" and see what happens!
export const userValidationResult = space.models.user.validate(userData)
