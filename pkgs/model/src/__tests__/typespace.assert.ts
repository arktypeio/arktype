import { assert } from "@re-/assert"
import { narrow } from "@re-/tools"
import { typespace } from ".."
import { typeDefProxy } from "../internal.js"

describe("compile", () => {
    test("single", () => {
        assert(typespace({ a: "string" }).types.a).typed as string
        // @ts-expect-error
        assert(() => typespace({ a: "strig" })).throwsAndHasTypeError(
            "Unable to determine the type of 'strig'."
        )
    })
    test("independent", () => {
        assert(typespace({ a: "string" }, { b: { c: "boolean" } }).types.b)
            .typed as { c: boolean }
        assert(() =>
            // @ts-expect-error
            typespace({ a: "string" }, { b: { c: "uhoh" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'uhoh'")
    })
    test("interdependent", () => {
        assert(typespace({ a: "string" }, { b: { c: "a" } }).types.b.c)
            .typed as string
        assert(() =>
            // @ts-expect-error
            typespace({ a: "yikes" }, { b: { c: "a" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'yikes'")
    })
    test("recursive", () => {
        // Recursive type displays any but calculates just-in-time for each property access
        assert(
            typespace({ a: { dejaVu: "a?" } }).types.a.dejaVu?.dejaVu?.dejaVu
        ).type.toString.snap(`"{ dejaVu?: any | undefined; } | undefined"`)
    })
    test("cyclic", () => {
        const { types } = typespace({ a: { b: "b" } }, { b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        assert(types.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        assert(types.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        assert(types.a.b.a.b.c).type.errors(
            "Property 'c' does not exist on type '{ a: { b: any; }; }'."
        )
    })
    test("object list", () => {
        assert(typespace({ a: "string" }, { b: [{ c: "a" }] }).types.b)
            .typed as {
            c: string
        }[]
        // Can't pass in object list directly to compile
        // @ts-expect-error
        assert(() => typespace([{ b: { c: "string" } }])).throws.snap(`
            "Compile args must be a list of names mapped to their corresponding definitions
                        passed as rest args, e.g.:
                        compile(
                            { user: { name: \\"string\\" } },
                            { group: \\"user[]\\" }
                        )"
        `)
    })
    test("can parse from compiled types", () => {
        const { model: parse } = typespace({ a: { b: "b" } }, { b: { a: "a" } })
        assert(parse("a|b|null").type).type.toString.snap(
            `"{ b: { a: { b: { a: any; }; }; }; } | { a: { b: { a: { b: any; }; }; }; } | null"`
        )
        assert(() =>
            // @ts-expect-error
            parse({ nested: { a: "a", b: "b", c: "c" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'c'")
    })
    test("compile result", () => {
        const mySpace = typespace({ a: { b: "b?" } }, { b: { a: "a?" } })
        const a = mySpace.model("a")
        assert(a.type)
            .is(typeDefProxy)
            .type.toString()
            .snap(
                `"{ b?: { a?: { b?: any | undefined; } | undefined; } | undefined; }"`
            )
        assert(mySpace.a.references()).equals({ b: ["b"] } as any)
        const aWithExtraneousKey = { c: "extraneous" }
        const extraneousKeyMessage = "Keys 'c' were unexpected."
        assert(() => a.validate(aWithExtraneousKey)).throws(
            extraneousKeyMessage
        )
        assert(a.generate()).equals({})
        assert(a.references()).equals(["a"] as any)
        assert(a.definition).typedValue("a")
        const expectedTypespace = narrow({ a: { b: "b?" }, b: { a: "a?" } })
        assert(a.typespace).typedValue(expectedTypespace)
        assert(mySpace.model("b").type)
            .is(typeDefProxy)
            .type.toString.snap(
                `"{ a?: { b?: { a?: any | undefined; } | undefined; } | undefined; }"`
            )
        assert(mySpace.b.references()).equals({ a: ["a"] } as any)
    })
})
