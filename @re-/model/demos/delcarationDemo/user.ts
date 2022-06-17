import { define } from "./declareDemo.js"

export const userDef = define.user({
    name: "string",
    bestFriend: "user?",
    // Type Hint: "Unable to determine the type of 'grop'"
    groups: "grop[]"
})
