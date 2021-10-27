import { define } from "./multifile.test"

export const user = define.user({
    name: "string",
    bestFriend: "user?",
    groups: "group[]"
})
