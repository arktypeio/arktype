import { createModel, createModel2, declare } from "./model"
import { user } from "./user"
import { group } from "./group"

// export const model = createModel(user, group)

export const define = declare("user", "group")

define.group.as({ a: "user[]" })

// model.define("new", {
//     prop: "string",
//     prop2: "user"
// })
