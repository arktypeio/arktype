import { define } from "../multifile.assert.js"

export const getUserDef = () =>
    define.user({
        name: "string",
        bestFriend: "user?",
        groups: "group[]"
    })
