/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("intersection", () => {
    it("two types", () => {
        const t = type("boolean&true")
        attest(t.infer).typed as true
        // attest(t.node).snap("true")
    })
    it("intersection parsed before union", () => {
        // Should be parsed as:
        // 1. "0" | ("1"&"string") | "2"
        // 2. "0" | "1" | "2"
        const t = type("'0'|'1'&string|'2'")
        attest(t.infer).typed as "0" | "1" | "2"
        // attest(t.node).snap({
        //     string: [{ value: "0" }, { value: "1" }, { value: "2" }]
        // })
    })
    it("tuple expression", () => {
        const t = type([{ a: "string" }, "&", { b: "number" }])
        attest(t.infer).typed as {
            a: string
            b: number
        }
    })
    it("regex", () => {
        const t = type("email&/@arktype.io$/")
        attest(t.infer).typed as string
        attest(t("shawn@arktype.io").data).snap("shawn@arktype.io")
        attest(t("shawn@arktype.oi").problems?.summary).snap(
            "Must be a string matching /@arktype.io$/ (was 'shawn@arktype.oi')"
        )
    })
    it("multiple valid types", () => {
        const t = type("email&lowercase<5")
        attest(t("ShawnArktype.io").problems?.summary).snap(
            "'ShawnArktype.io' must be...\n• a string matching /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/\n• a string matching /^[a-z]*$/\n• less than 5 characters"
        )
    })
    it("several types", () => {
        const t = type("unknown&boolean&false")
        attest(t.infer).typed as false
        // attest(t.node).snap("false")
    })
    describe("literals", () => {
        it("class+literal", () => {})
        it("domain+literal", () => {})
        it("literal+literal", () => {})
        it("constraints + literal", () => {})
    })
    it("helper", () => {
        const t = type({ a: "string" }).and({ b: "boolean" })
        attest(t.infer).typed as {
            a: string
            b: boolean
        }
        // attest(t.node).snap({
        //     object: { props: { a: "string", b: "boolean" } }
        // })
    })
    it("string type", () => {
        const t = type([["string", "string"], "&", "alpha[]"])
        // attest(t.node).snap({
        //     object: {
        //         instance: "(function Array)",
        //         props: {
        //             "0": "alpha",
        //             "1": "alpha",
        //             length: ["!", { number: { value: 2 } }]
        //         }
        //     }
        // })
        attest(t(["1", 1]).problems?.summary).snap(
            "Item at index 0 must be only letters (was '1')\nItem at index 1 must be only letters (was number)"
        )
    })
    it("multiple types with union array", () => {
        const t = type([["number", "string"], "&", "('one'|1)[]"])
        // attest(t.node).snap({
        //     object: {
        //         instance: "(function Array)",
        //         props: {
        //             "0": { number: { value: 1 } },
        //             "1": { string: { value: "one" } },
        //             length: ["!", { number: { value: 2 } }]
        //         }
        //     }
        // })
    })
    describe("errors", () => {
        it("bad reference", () => {
            // @ts-expect-error
            attest(() => type("boolean&tru"))
                .throws(writeUnresolvableMessage("tru"))
                .types.errors("boolean&true")
        })
        it("double and", () => {
            // @ts-expect-error
            attest(() => type("boolean&&true")).throws(
                writeMissingRightOperandMessage("&", "&true")
            )
        })
        it("implicit never", () => {
            // // @ts-expect-error
            // attest(() => type("string&number")).throwsAndHasTypeError(
            //     "results in an unsatisfiable type"
            // )
        })
        it("helper parse", () => {
            attest(() =>
                // @ts-expect-error
                intersection({ a: "what" }, { b: "boolean" })
            ).throwsAndHasTypeError(writeUnresolvableMessage("what"))
        })
        it("helper implicit never", () => {
            attest(() => type("string").and("number")).throws(
                "results in an unsatisfiable type"
            )
        })
    })
})
