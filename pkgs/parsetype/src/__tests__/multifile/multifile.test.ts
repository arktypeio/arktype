import { declare } from "../../main.js"
import { expectType } from "tsd"

export const { define, compile } = declare("user", "group")

import { user } from "./user"
import { group } from "./group"

export const { types, parse } = compile(user, group)

export type ExpectedUser = {
    name: string
    bestFriend?: ExpectedUser
    groups: ExpectedGroup[]
}

export type ExpectedGroup = {
    name: string
    members: ExpectedUser[]
}

describe("multifile", () => {
    test("compiles", () => {
        expectType<ExpectedUser>(types.user)
        expectType<ExpectedGroup>(types.group)
        expectType<ExpectedUser | undefined>(types.user.bestFriend)
        const doozler = parse({ foozler: "user", choozler: "group[]" }).type
        expectType<{ foozler: ExpectedUser; choozler: ExpectedGroup[] }>(
            doozler
        )
    })
})
