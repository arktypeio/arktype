//@re_place user.ts
import { define } from "./declareDemo"

//@re_place user.ts test
export const userDef = define.user({
    name: "string",
    bestFriend: "user?",
    // Type Hint: "Unable to determine the type of 'grop'"
    groups: "grop[]"
})
