import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { declare } from "../../index.js"

// Declare the models you will define
import { compile } from "./declaration/declaration.js"
import { groupDef } from "./declaration/group.js"
import { userDef } from "./declaration/user.js"

// TODO: Update these tests to just be responsible for checking space is created consistently
describe("declare", () => {
    test("compiles", () => {
        // Creates your space (or tells you which definition you forgot to include)
        const space = compile({ ...userDef, ...groupDef })
        assert(space.$root.infer.user.name).typed as string
        assert(space.$root.infer.user).type.toString.snap(
            `{ groups: { name: string; members: { groups: { name: string; members: any[]; }[]; name: string; bestFriend?: any | undefined; }[]; }[]; name: string; bestFriend?: { groups: { name: string; members: { groups: any[]; name: string; bestFriend?: any | undefined; }[]; }[]; name: string; bestFriend?: any | undefined; } | undefined; }`
        )
        assert(space.group.infer).type.toString.snap(
            `{ name: string; members: { groups: { name: string; members: { groups: any[]; name: string; bestFriend?: any | undefined; }[]; }[]; name: string; bestFriend?: any | undefined; }[]; }`
        )
        assert(space.user.infer.bestFriend).type.toString.snap(
            `{ groups: { name: string; members: { groups: any[]; name: string; bestFriend?: any | undefined; }[]; }[]; name: string; bestFriend?: any | undefined; } | undefined`
        )
        assert(
            space.$root.type({ foozler: "user", choozler: "group[]" }).infer
        ).type.toString.snap(
            `{ foozler: { groups: { name: string; members: { groups: { name: string; members: any[]; }[]; name: string; bestFriend?: any | undefined; }[]; }[]; name: string; bestFriend?: { groups: { name: string; members: { groups: any[]; name: string; bestFriend?: any | undefined; }[]; }[]; name: string; bestFriend?: any | undefined; } | undefined; }; choozler: { name: string; members: { groups: { name: string; members: any[]; }[]; name: string; bestFriend?: any | undefined; }[]; }[]; }`
        )
    })
    test("single", () => {
        const { define, compile } = declare("gottaDefineThis")
        const gottaDefineThis = define.gottaDefineThis("boolean")
        assert(() =>
            // @ts-expect-error
            define.somethingUndeclared("string")
        ).throwsAndHasTypeError("somethingUndeclared")
        // @ts-expect-error
        assert(() => define.gottaDefineThis("whoops")).throwsAndHasTypeError(
            "'whoops' is not a builtin type and does not exist in your space."
        )
        const space = compile(gottaDefineThis)
        assert(space.$root.type({ a: "gottaDefineThis" }).infer).typed as {
            a: boolean
        }
    })
    test("errors on compile with declared type undefined", () => {
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
    test("errors on compile with undeclared type defined", () => {
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
