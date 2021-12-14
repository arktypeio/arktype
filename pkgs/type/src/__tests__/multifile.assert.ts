import { assert } from "@re-/assert"
import { declare } from ".."

export const { define, compile } = declare("user", "group")

import { user as userDef } from "./multifile/user"
import { group as groupDef } from "./multifile/group"

export const { user, group, parse, types } = compile(userDef, groupDef)

describe("multifile", () => {
    test("compiles", () => {
        assert(types.user.name).typed as string
        assert(types.user).type.toString.snap(
            `"{ bestFriend?: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }"`
        )
        assert(group.type).type.toString.snap(
            `"{ name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; }[]; }"`
        )
        assert(user.type.bestFriend).type.toString.snap(
            `"{ bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined"`
        )
        assert(
            parse({ foozler: "user", choozler: "group[]" }).type
        ).type.toString.snap(
            `"{ foozler: { bestFriend?: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }; choozler: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }"`
        )
    })
})
