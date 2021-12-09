import { assert } from "@re-do/assert"
import { declare } from ".."

export const { define, compile } = declare("user", "group")

import { user } from "./multifile/user"
import { group } from "./multifile/group"

export const { types, parse } = compile(user, group)

describe("multifile", () => {
    test("compiles", () => {
        assert(types.user.type.name).typed as string
        assert(types.user.type).type.toString.snap(
            `"{ bestFriend?: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }"`
        )
        assert(types.group.type).type.toString.snap(
            `"{ name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; }[]; }"`
        )
        assert(types.user.type.bestFriend).type.toString.snap(
            `"{ bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined"`
        )
        assert(
            parse({ foozler: "user", choozler: "group[]" }).type
        ).type.toString.snap(
            `"{ foozler: { bestFriend?: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }; choozler: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }"`
        )
    })
})
