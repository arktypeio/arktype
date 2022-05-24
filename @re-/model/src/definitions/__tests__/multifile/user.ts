import { define } from "../multifile.assert.js"

export const userDef = define.user({
    name: "string",
    bestFriend: "user?",
    groups: "group[]"
})
