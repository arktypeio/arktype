import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { space } from "../api.js"
import { Unenclosed } from "../parser/str/operand/unenclosed.js"

describe("space", () => {
    test("single", () => {
        attest(space({ a: "string" }).$.infer.a).typed as string
        attest(() =>
            // @ts-expect-error
            space({ a: "strig" })
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("strig"))
    })
    test("independent", () => {
        attest(space({ a: "string", b: { c: "boolean" } }).$.infer.b).typed as {
            c: boolean
        }
        attest(() =>
            space(
                // @ts-expect-error
                { a: "string", b: { c: "uhoh" } }
            )
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("uhoh"))
    })
    test("interdependent", () => {
        attest(space({ a: "string", b: { c: "a" } }).$.infer.b.c)
            .typed as string
        attest(() =>
            // @ts-expect-error
            space({ a: "yikes", b: { c: "a" } })
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("yikes"))
    })
    test("cyclic", () => {
        const cyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        attest(cyclicSpace.$.infer.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        attest(cyclicSpace.$.infer.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(cyclicSpace.$.infer.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    test("object array", () => {
        attest(space({ a: "string", b: [{ c: "a" }] }).$.infer.b).typed as [
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
        // attest({} as ReturnType<typeof parseWithAnySpace>["infer"]).typed as {
        //     alias: unknown
        //     literal: string
        // }
        // attest(parseWithAnySpace).throws(unresolvableMessage("myType"))
    })
    // TODO: Reenable
    // test("doesn't try to validate any as a dictionary member", () => {
    //     attest(space({ a: {} as any }).$.type(["number", "a"]).infer)
    //         .typed as [number, any]
    // })
})
