import { assert } from "@re-/assert"
// import { declare } from "#api"

// // Declare the models you will define
// export const { define, compile } = declare("user", "group")
import { compile } from "./multifile/declaration.js"
import { groupDef } from "./multifile/group.js"
import { userDef } from "./multifile/user.js"

describe("multifile", () => {
    it("compiles", () => {
        // Creates your space (or tells you which definition you forgot to include)
        const space = compile({ ...userDef, ...groupDef })
        assert(space.types.user.name).typed as string
        assert(space.types.user).type.toString.snap(
            `{ name: string; groups: { name: string; members: { name: string; groups: { name: string; members: any[]; }[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: { name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; } | undefined; }`
        )
        assert(space.models.group.type).type.toString.snap(
            `{ name: string; members: { name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; }[]; }`
        )
        assert(space.models.user.type.bestFriend).type.toString.snap(
            `{ name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; } | undefined`
        )
        assert(
            space.create({ foozler: "user", choozler: "group[]" }).type
        ).type.toString.snap(
            `{ foozler: { name: string; groups: { name: string; members: { name: string; groups: { name: string; members: any[]; }[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: { name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; } | undefined; }; choozler: { name: string; members: { name: string; groups: { name: string; members: any[]; }[]; bestFriend?: any | undefined; }[]; }[]; }`
        )
    })
})
