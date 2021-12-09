import { define } from "../multifile.assert"

export const user = define.user({
    name: "string",
    bestFriend: "user?",
    groups: "group[]"
})
