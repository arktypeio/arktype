import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { space } from "../api.js"
import { Unenclosed } from "../parser/str/operand/unenclosed.js"

describe("space", () => {
    test("single", () => {
        assert(space({ a: "string" }).$.infer.a).typed as string
        assert(() =>
            // @ts-expect-error
            space({ a: "strig" })
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("strig"))
    })
    test("independent", () => {
        assert(space({ a: "string", b: { c: "boolean" } }).$.infer.b).typed as {
            c: boolean
        }
        assert(() =>
            space(
                // @ts-expect-error
                { a: "string", b: { c: "uhoh" } }
            )
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("uhoh"))
    })
    test("interdependent", () => {
        assert(space({ a: "string", b: { c: "a" } }).$.infer.b.c)
            .typed as string
        assert(() =>
            // @ts-expect-error
            space({ a: "yikes", b: { c: "a" } })
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("yikes"))
    })
    test("cyclic", () => {
        const cyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        assert(cyclicSpace.$.infer.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        assert(cyclicSpace.$.infer.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        assert(cyclicSpace.$.infer.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    test("object array", () => {
        assert(space({ a: "string", b: [{ c: "a" }] }).$.infer.b).typed as [
            {
                c: string
            }
        ]
    })
    test("doesn't try to validate any as a dictionary", () => {
        // const parseWithAnySpace = () =>
        //     space({} as any).$.type({
        //         literal: "string",
        //         // @ts-expect-error Still complains about unknown keys
        //         alias: "myType"
        //     })
        // assert({} as ReturnType<typeof parseWithAnySpace>["infer"]).typed as {
        //     alias: unknown
        //     literal: string
        // }
        // assert(parseWithAnySpace).throws(unresolvableMessage("myType"))
    })
    // TODO: Reenable
    // test("doesn't try to validate any as a dictionary member", () => {
    //     assert(space({ a: {} as any }).$.type(["number", "a"]).infer)
    //         .typed as [number, any]
    // })
    test("model from space", () => {
        const anotherCyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        assert(anotherCyclicSpace.$.type("a|b|null").infer).typed as
            | { b: { a: { b: { a: any } } } }
            | { a: { b: { a: { b: any } } } }
            | null
        assert(() =>
            anotherCyclicSpace.$.type(
                // @ts-expect-error
                { nested: { a: "a", b: "b", c: "c" } }
            )
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("c"))
    })
})
