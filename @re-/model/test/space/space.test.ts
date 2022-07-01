import { assert } from "@re-/assert"
import { space } from "../../src/index.js"

describe("space", () => {
    it("single", () => {
        assert(space({ a: "string" }).types.a).typed as string
        assert(() =>
            // @ts-expect-error
            space({ a: "strig" }, { parse: { eager: true } })
        ).throwsAndHasTypeError("Unable to determine the type of 'strig'.")
    })
    it("independent", () => {
        assert(space({ a: "string", b: { c: "boolean" } }).types.b).typed as {
            c: boolean
        }
        assert(() =>
            space(
                // @ts-expect-error
                { a: "string", b: { c: "uhoh" } },
                { parse: { eager: true } }
            )
        ).throwsAndHasTypeError("Unable to determine the type of 'uhoh'")
    })
    it("interdependent", () => {
        assert(space({ a: "string", b: { c: "a" } }).types.b.c).typed as string
        assert(() =>
            // @ts-expect-error
            space({ a: "yikes", b: { c: "a" } }, { parse: { eager: true } })
        ).throwsAndHasTypeError("Unable to determine the type of 'yikes'")
    })
    it("cyclic", () => {
        const cyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        assert(cyclicSpace.types.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        assert(cyclicSpace.types.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        assert(cyclicSpace.types.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    it("object list", () => {
        assert(space({ a: "string", b: [{ c: "a" }] }).types.b).typed as [
            {
                c: string
            }
        ]
    })
    it("create from space", () => {
        const anotherCyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        assert(anotherCyclicSpace.create("a|b|null").type).type.toString.snap(
            "{ b: { a: { b: { a: any; }; }; }; } | { a: { b: { a: { b: any; }; }; }; } | null"
        )
        assert(() =>
            anotherCyclicSpace.create(
                // @ts-expect-error
                { nested: { a: "a", b: "b", c: "c" } },
                { parse: { eager: true } }
            )
        ).throwsAndHasTypeError("Unable to determine the type of 'c'")
    })
    it("extension", () => {
        const mySpace = space(
            {
                __meta__: {
                    onCycle: "number"
                },
                user: { name: "string" },
                group: { members: "user[]" }
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
                __meta__: {
                    onCycle: "boolean"
                },
                user: { age: "number" },
                other: { users: "user[]", groups: "group[]" }
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
        assert(extended.types).typed as {
            user: {
                age: number
            }
            group: {
                members: {
                    age: number
                }[]
            }
            other: {
                users: {
                    age: number
                }[]
                groups: {
                    members: {
                        age: number
                    }[]
                }[]
            }
        }
        assert(extended.inputs.dictionary).snap({
            __meta__: {
                onCycle: `boolean`
            },
            user: { age: `number` },
            group: { members: `user[]` },
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
