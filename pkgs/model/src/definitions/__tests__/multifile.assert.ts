import { assert } from "@re-/assert"
import { declare } from "@re-/model"

export const { define, compile } = declare("user", "group")

import { getUserDef } from "./multifile/user"
import { getGroupDef } from "./multifile/group"

describe("multifile", () => {
    test("compiles", () => {
        const {
            user,
            group,
            create: defineDependent,
            types
        } = compile({ ...getUserDef(), ...getGroupDef() })
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
            defineDependent({ foozler: "user", choozler: "group[]" }).type
        ).type.toString.snap(
            `"{ foozler: { bestFriend?: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }; choozler: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }"`
        )
    })
})
