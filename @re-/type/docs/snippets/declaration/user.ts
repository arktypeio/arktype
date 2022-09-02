import { define } from "./declaration.js"

export const userDef = define.user({
    name: "string",
    bestFriend: "user?",
    groups: "group[]"
})
