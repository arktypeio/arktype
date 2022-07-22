import { assert } from "@re-/assert"
import { declare } from "../../src/index.js"

// Declare the models you will define
import { compile } from "./declaration/declaration.js"
import { groupDef } from "./declaration/group.js"
import { userDef } from "./declaration/user.js"

describe("multifile", () => {
    it("compiles", () => {
        // Creates your space (or tells you which definition you forgot to include)
        const space = compile({ ...userDef, ...groupDef })
        assert(space.$meta.infer.user.name).typed as string
        assert(space.$meta.infer.user).type.toString.snap(
            `{ name: string; groups: { name: string; members: { name: string; groups: { name: string; members: any[]; }[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: { name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; } | undefined; }`
        )
        assert(space.group.infer).type.toString.snap(
            `{ name: string; members: { name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; }[]; }`
        )
        assert(space.user.infer.bestFriend).type.toString.snap(
            `{ name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; } | undefined`
        )
        assert(
            space.$meta.type({ foozler: "user", choozler: "group[]" }).infer
        ).type.toString.snap(
            `{ foozler: { name: string; groups: { name: string; members: { name: string; groups: { name: string; members: any[]; }[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: { name: string; groups: { name: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; } | undefined; }; choozler: { name: string; members: { name: string; groups: { name: string; members: any[]; }[]; bestFriend?: any | undefined; }[]; }[]; }`
        )
    })
    it("single", () => {
        const { define, compile } = declare("gottaDefineThis")
        const gottaDefineThis = define.gottaDefineThis("boolean")
        assert(() =>
            // @ts-expect-error
            define.somethingUndeclared("string")
        ).throwsAndHasTypeError("somethingUndeclared")
        // @ts-expect-error
        assert(() => define.gottaDefineThis("whoops")).throwsAndHasTypeError(
            "Unable to determine the type of 'whoops'"
        )
        const space = compile(gottaDefineThis)
        assert(space.$meta.type({ a: "gottaDefineThis" }).infer).typed as {
            a: boolean
        }
    })
    it("errors on compile with declared type undefined", () => {
        const { define, compile } = declare(
            "gottaDefineThis",
            "gottaDefineThisToo"
        )
        const gottaDefineThis = define.gottaDefineThis({
            a: "string"
        })
        // @ts-expect-error
        assert(() => compile(gottaDefineThis))
            .throws("Declared types 'gottaDefineThisToo' were never defined.")
            .type.errors("Property 'gottaDefineThisToo' is missing")
    })
    it("errors on compile with undeclared type defined", () => {
        const { define, compile } = declare("gottaDefineThis")
        const gottaDefineThis = define.gottaDefineThis("boolean")
        assert(() =>
            compile({
                ...gottaDefineThis,
                // @ts-expect-error
                cantDefineThis: "boolean",
                // @ts-expect-error
                wontDefineThis: "string"
            })
        ).throws(
            "Defined types 'cantDefineThis', 'wontDefineThis' were never declared."
        ).type.errors
            .snap(`Type '"boolean"' is not assignable to type '"Invalid property 'cantDefineThis'. Valid properties are: gottaDefineThis"'.
Type '"string"' is not assignable to type '"Invalid property 'wontDefineThis'. Valid properties are: gottaDefineThis"'.`)
    })
})
