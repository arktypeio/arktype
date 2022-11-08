import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { space } from "../api.js"
import { Unenclosed } from "../parse/operand/unenclosed.js"

describe("space", () => {
    test("single", () => {
        attest(space({ a: "string" }).$.infer.a).typed as string
        attest(() =>
            // @ts-expect-error
            space({ a: "strig" })
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("strig"))
    })
    test("interdependent", () => {
        const types = space({ a: "string>5", b: "email<=10", c: "a&b" })
        attest(types.c.attributes).equals({
            type: "string",
            regex: "/^(.+)@(.+)\\.(.+)$/",
            bounds: ">5<=10"
        })
        attest(types.$.infer.c).typed as string
    })
    test("cyclic", () => {
        const cyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        attest(cyclicSpace.a.attributes).snap({
            type: "dictionary",
            props: {
                b: { type: "dictionary", props: { a: { alias: "a" } } }
            }
        })
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
