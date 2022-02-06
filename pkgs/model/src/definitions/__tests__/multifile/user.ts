import { define } from "../multifile.assert"

export const getUserDef = () =>
    define.user({
        name: "string",
        bestFriend: "user?",
        groups: "group[]"
    })
