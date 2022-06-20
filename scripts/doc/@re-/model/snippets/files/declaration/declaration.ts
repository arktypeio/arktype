import { declare } from "../../src/index.js"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { groupDef } from "./group.js"
import { userDef } from "./user.js"

// Creates your space (or tells you which definition you forgot to include)
export const space = compile({ ...userDef, ...groupDef })
