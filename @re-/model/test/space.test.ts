import { assert } from "@re-/assert"
import { compile } from "#src"

describe("compile", () => {
    it("single", () => {
        assert(compile({ a: "string" }).types.a).typed as string
        assert(() =>
            // @ts-expect-error
            compile({ a: "strig" }, { parse: { eager: true } })
        ).throwsAndHasTypeError("Unable to determine the type of 'strig'.")
    })
    it("independent", () => {
        assert(compile({ a: "string", b: { c: "boolean" } }).types.b).typed as {
            c: boolean
        }
        assert(() =>
            compile(
                // @ts-expect-error
                { a: "string", b: { c: "uhoh" } },
                { parse: { eager: true } }
            )
        ).throwsAndHasTypeError("Unable to determine the type of 'uhoh'")
    })
    it("interdependent", () => {
        assert(compile({ a: "string", b: { c: "a" } }).types.b.c)
            .typed as string
        assert(() =>
            // @ts-expect-error
            compile({ a: "yikes", b: { c: "a" } }, { parse: { eager: true } })
        ).throwsAndHasTypeError("Unable to determine the type of 'yikes'")
    })
    it("recursive", () => {
        // Recursive type displays any but calculates just-in-time for each property access
        assert(
            compile({ a: { dejaVu: "a?" } }).types.a.dejaVu?.dejaVu?.dejaVu
        ).type.toString.snap("{ dejaVu?: any | undefined; } | undefined")
    })
    it("cyclic", () => {
        const space = compile({ a: { b: "b" }, b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        assert(space.types.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        assert(space.types.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        assert(space.types.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    it("object list", () => {
        assert(compile({ a: "string", b: [{ c: "a" }] }).types.b).typed as [
            {
                c: string
            }
        ]
    })
    it("can parse from compiled types", () => {
        const space = compile({ a: { b: "b" }, b: { a: "a" } })
        assert(space.create("a|b|null").type).type.toString.snap(
            "{ b: { a: { b: { a: any; }; }; }; } | { a: { b: { a: { b: any; }; }; }; } | null"
        )
        assert(() =>
            space.create(
                // @ts-expect-error
                { nested: { a: "a", b: "b", c: "c" } },
                { parse: { eager: true } }
            )
        ).throwsAndHasTypeError("Unable to determine the type of 'c'")
    })
    it("extension", () => {
        const mySpace = compile(
            {
                user: { name: "string" },
                group: { members: "user[]" },
                onCycle: "number"
            },
            {
                validate: { ignoreExtraneousKeys: true },
                models: {
                    user: {
                        validate: {
                            ignoreExtraneousKeys: false
                        }
                    }
                }
            }
        )
        const extended = mySpace.extend(
            {
                user: { age: "number" },
                other: { users: "user[]", groups: "group[]" },
                onCycle: "boolean"
            },
            {
                models: {
                    group: {
                        generate: {
                            onRequiredCycle: true
                        }
                    },
                    other: {
                        validate: {
                            ignoreExtraneousKeys: true
                        }
                    }
                }
            }
        )
        assert(extended.types).type.toString.snap(
            `{ user: { age: number; }; group: { members: { age: number; }[]; }; other: { groups: { members: { age: number; }[]; }[]; users: { age: number; }[]; }; }`
        )
        assert(extended.inputs.dictionary).snap({
            user: { age: `number` },
            group: { members: `user[]` },
            onCycle: `boolean`,
            other: { users: `user[]`, groups: `group[]` }
        })
        assert(extended.inputs.options).snap({
            validate: { ignoreExtraneousKeys: true },
            models: {
                user: { validate: { ignoreExtraneousKeys: false } },
                group: { generate: { onRequiredCycle: true } },
                other: { validate: { ignoreExtraneousKeys: true } }
            }
        })
    })
})
