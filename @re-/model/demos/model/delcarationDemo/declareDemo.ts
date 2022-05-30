/**
 * @re_place declareDemo.ts
 */
import { declare } from "@re-/model"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { groupDef } from "./group.js"
import { userDef } from "./user.js"

// Creates your space (or tells you which definition you forgot to include)
const space = compile({ ...userDef, ...groupDef })
