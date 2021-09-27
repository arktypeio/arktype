import { declare } from "../.."
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
        // Writing the next statement as
        // const { foozler } = parse({ foozler: "user" })
        // results in TS parsing type of "user" as generic string and breaks the type
        // No idea why
        const doozler = parse({ foozler: "user", choozler: "group[]" })
        expectType<{ foozler: ExpectedUser; choozler: ExpectedGroup[] }>(
            doozler
        )
    })
})
