import { createModel, declareTypes } from "./model"
import { user } from "./user"
import { group } from "./group"

export const { define } = declareTypes("user", "group")

export const model = createModel(user, group)

// model.define("new", {
//     prop: "string",
//     prop2: "user"
// })
