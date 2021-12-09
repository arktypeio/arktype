import { assert } from "@re-do/assert"
import { narrow } from "@re-do/utils"
import { compile } from ".."
import { typeDefProxy } from "../internal.js"

describe("compile", () => {
    test("single", () => {
        assert(compile({ a: "string" }).types.a.type).typed as string
        // @ts-expect-error
        assert(() => compile({ a: "strig" })).throwsAndHasTypeError(
            "Unable to determine the type of 'strig'."
        )
    })
    test("independent", () => {
        assert(compile({ a: "string" }, { b: { c: "boolean" } }).types.b.type)
            .typed as { c: boolean }
        assert(() =>
            // @ts-expect-error
            compile({ a: "string" }, { b: { c: "uhoh" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'uhoh'")
    })
    test("interdependent", () => {
        assert(compile({ a: "string" }, { b: { c: "a" } }).types.b.type.c)
            .typed as string
        assert(() =>
            // @ts-expect-error
            compile({ a: "yikes" }, { b: { c: "a" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'yikes'")
    })
    test("recursive", () => {
        // Recursive type displays any but calculates just-in-time for each property access
        assert(
            compile({ a: { dejaVu: "a?" } }).types.a.type.dejaVu?.dejaVu?.dejaVu
        ).type.toString.snap(`"{ dejaVu?: any | undefined; } | undefined"`)
    })
    test("cyclic", () => {
        const { types } = compile({ a: { b: "b" } }, { b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        assert(types.a.type).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        assert(types.b.type.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        assert(types.a.type.b.a.b.c).type.errors(
            "Property 'c' does not exist on type '{ a: { b: any; }; }'."
        )
    })
    test("object list", () => {
        assert(compile({ a: "string" }, { b: [{ c: "a" }] }).types.b.type)
            .typed as { c: string }[]
        // Can't pass in object list directly to compile
        // @ts-expect-error
        assert(() => compile([{ b: { c: "string" } }])).throws.snap(`
            "Compile args must be a list of names mapped to their corresponding definitions
                        passed as rest args, e.g.:
                        compile(
                            { user: { name: \\"string\\" } },
                            { group: \\"user[]\\" }
                        )"
        `)
    })
    test("can parse from compiled types", () => {
        const { parse } = compile({ a: { b: "b" } }, { b: { a: "a" } })
        assert(parse("a|b|null").type).type.toString.snap(
            `"{ b: { a: { b: { a: any; }; }; }; } | { a: { b: { a: { b: any; }; }; }; } | null"`
        )
        assert(() =>
            // @ts-expect-error
            parse({ nested: { a: "a", b: "b", c: "c" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'c'")
    })
    test("compile result", () => {
        const typeSet = compile({ a: { b: "b?" } }, { b: { a: "a?" } })
        const parsedA = typeSet.parse("a")
        assert(parsedA.type)
            .is(typeDefProxy)
            .type.toString()
            .snap(
                `"{ b?: { a?: { b?: any | undefined; } | undefined; } | undefined; }"`
            )
        assert(typeSet.types.a.references()).equals({ b: ["b"] } as any)
        assert(parsedA.allows({})).equals({})
        const aWithExtraneousKey = { c: "extraneous" }
        const extraneousKeyMessage = "Keys 'c' were unexpected."
        assert(() => parsedA.assert(aWithExtraneousKey)).throws(
            extraneousKeyMessage
        )
        assert(() => parsedA.check({ c: {} })).returns(extraneousKeyMessage)
        assert(parsedA.generate()).equals({})
        assert(parsedA.references()).equals(["a"] as any)
        assert(parsedA.definition).typedValue("a")
        const expectedTypeSet = narrow({ a: { b: "b?" }, b: { a: "a?" } })
        assert(parsedA.typeSet).typedValue(expectedTypeSet)
        assert(typeSet.parse("b").type)
            .is(typeDefProxy)
            .type.toString.snap(
                `"{ a?: { b?: { a?: any | undefined; } | undefined; } | undefined; }"`
            )
    })
})
