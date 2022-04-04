import { assert } from "@re-/assert"
import { declare } from "@re-/model"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { userDef } from "./multifile/user"
import { groupDef } from "./multifile/group"

describe("multifile", () => {
    test("compiles", () => {
        // Creates your space (or tells you which definition you forgot to include)
        const { models, create, types } = compile({ ...userDef, ...groupDef })
        assert(types.user.name).typed as string
        assert(types.user).type.toString.snap(
            `"{ bestFriend?: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }"`
        )
        assert(models.group.type).type.toString.snap(
            `"{ name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; }[]; }"`
        )
        assert(models.user.type.bestFriend).type.toString.snap(
            `"{ bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined"`
        )
        assert(
            create({ foozler: "user", choozler: "group[]" }).type
        ).type.toString.snap(
            `"{ foozler: { bestFriend?: { bestFriend?: any | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; }[]; } | undefined; name: string; groups: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }; choozler: { name: string; members: { bestFriend?: any | undefined; name: string; groups: { name: string; members: any[]; }[]; }[]; }[]; }"`
        )
    })
})
