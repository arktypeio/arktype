import { declareTypes, parse } from ".."
import { user } from "./user"
import { group } from "./group"
import { createTypeSet } from "parse"

export const { define } = declareTypes("user", "group")

export const { types } = createTypeSet(user, group)

export type User = typeof types.user
export type Group = typeof types.group
