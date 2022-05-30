/**
 * @re_place declareDemo.ts
 */
import { declare } from "@re-/model"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { userDef } from "./user"
import { groupDef } from "./group"

// Creates your space (or tells you which definition you forgot to include)
const space = compile({ ...userDef, ...groupDef })
