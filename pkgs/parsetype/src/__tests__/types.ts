import { declareTypes, parse } from ".."
import { user } from "./user"
import { group } from "./group"

export const { define } = declareTypes("user", "group")

export const types = parse(user, group)

export type User = typeof types.user
export type Group = typeof types.group
