import { declare } from "@re-/model"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { userDef } from "./user.js"
import { groupDef } from "./group.js"

// Creates your space (or tells you which definition you forgot to include)
const space = compile({ ...userDef, ...groupDef })
