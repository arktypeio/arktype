import { declare } from "../../main.js"
import tsd, { expectType, printType } from "tsd"

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

// printType(types.user.type)

describe("multifile", () => {
    test("compiles", async () => {
        // const diag = await tsd({
        //     cwd: ".",
        //     testFiles: ["src/__tests__/**/*.test.ts"]
        // })
        expectType<ExpectedUser>(types.user.type)
        expectType<ExpectedGroup>(types.group.type)
        expectType<ExpectedUser | undefined>(types.user.type.bestFriend)
        const doozler = parse({ foozler: "user", choozler: "group[]" }).type
        expectType<{ foozler: ExpectedUser; choozler: ExpectedGroup[] }>(
            doozler
        )
    })
})
