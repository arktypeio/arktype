import { suite, test } from "mocha"
import { declare, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("declared", () => {
    test("shallow", () => {
        const shallow = declare<number>().type("number")
        attest(shallow.infer).typed as number
        attest(shallow.condition).equals(type("number").condition)
    })

    test("obj", () => {
        type Expected = { a: string; b?: number }
        const t = declare<Expected>().type({
            a: "string",
            "b?": "number"
        })
        attest(t.infer).typed as Expected
    })

    test("tuple", () => {
        type Expected = [string, number]
        const t = declare<Expected>().type(["string", "number"])
        attest(t.infer).typed as Expected
    })

    test("bad element", () => {
        attest(
            // @ts-expect-error
            declare<[string, number]>().type(["string", "boolean"])
        ).types.errors(
            `Type 'string' is not assignable to type '{ declared: number; inferred: boolean; }'`
        )
    })

    test("too short", () => {
        // @ts-expect-error
        attest(declare<[string, number]>().type(["string"])).types.errors(
            `Source has 1 element(s) but target requires 2`
        )
    })

    test("too long", () => {
        attest(
            // @ts-expect-error
            declare<[string, number]>().type(["string", "number", "number"])
        ).types.errors(`Source has 3 element(s) but target requires 2`)
    })

    test("tuple expression", () => {
        const t = declare<0 | 1>().type(["0", "|", "1"])
        attest(t.infer).typed as 0 | 1
    })

    test("regexp", () => {
        const t = declare<string>().type(/.*/)
        attest(t.infer).typed as string
    })

    test("Inferred<t>", () => {
        const foo = type("'foo'")
        const t = declare<"foo">().type(foo)
        attest(t.infer).typed as "foo"
    })

    test("bad tuple expression", () => {
        attest(
            // @ts-expect-error
            declare<"foo" | "bar">().type(["'foo'", "|", "'baz'"])
        ).types.errors(`{ declared: "foo" | "bar"; inferred: "foo" | "baz"; }`)
    })

    test("narrower", () => {
        // @ts-expect-error
        attest(() => declare<string>().type("'foo'")).types.errors(
            `Argument of type 'string' is not assignable to parameter of type '{ declared: string; inferred: "foo"; }'`
        )
    })

    test("wider", () => {
        attest(() =>
            declare<{ a: string }>().type({
                // @ts-expect-error
                a: "unknown"
            })
        ).types.errors(
            `Type 'string' is not assignable to type '{ declared: string; inferred: unknown; }'`
        )
    })

    test("missing key", () => {
        attest(() =>
            // @ts-expect-error
            declare<{ a: string; b: number }>().type({
                a: "string"
            })
        ).types.errors(
            `Property 'b' is missing in type '{ a: "string"; }' but required in type '{ a: "string"; "b?": unknown; }'.`
        )
    })

    test("missing optional key", () => {
        attest(() =>
            // @ts-expect-error
            declare<{ a: string; b?: number }>().type({
                a: "string"
            })
        ).types.errors(
            `Property '"b?"' is missing in type '{ a: "string"; }' but required in type '{ a: "string"; "b?": unknown; }'.`
        )
    })

    test("extraneous key", () => {
        attest(() =>
            declare<{ a: string }>().type({
                a: "string",
                // @ts-expect-error
                b: "boolean"
            })
        ).types.errors(
            `Object literal may only specify known properties, and 'b' does not exist in type '{ a: "string"; }'.`
        )
    })
})
