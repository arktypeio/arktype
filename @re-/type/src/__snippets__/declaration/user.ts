import { define } from "./names.js"

export const userDef = define.user({
    name: "string",
    bestFriend: "user?",
    groups: "group[]"
})
