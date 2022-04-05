import { define } from "./index"

// If you make a mistake in your definition, you'll get a type error
// Try changing group[] to grop[] (or whatever nonsense you'd prefer)
export const userDef = define.user({
    name: "string",
    bestFriend: "user?",
    groups: "group[]"
})
