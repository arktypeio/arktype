import { describe, it } from "mocha"
import { intersection, type } from "../../src/main.ts"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.ts"
import { attest } from "../attest/main.ts"

describe("intersection", () => {
    describe("parse", () => {
        it("two types", () => {
            const t = type("boolean&true")
            attest(t.infer).typed as true
            attest(t.node).snap("true")
        })
        it("regex", () => {
            const t = type("email&/@arktype.io$/")
            attest(t.infer).typed as string
            attest(t("shawn@arktype.io").data).snap("shawn@arktype.io")
            attest(t("shawn@arktype.oi").problems?.summary).snap(
                "Must be a string matching /@arktype.io$/ (was 'shawn@arktype.oi')"
            )
        })
        it("several types", () => {
            const t = type("unknown&boolean&false")
            attest(t.infer).typed as false
            attest(t.node).snap("false")
        })
        describe("number & literals", () => {
            it("same literal", () => {
                attest(type("2&2").node).snap({ number: { value: 2 } })
            })
            it("literal&number type", () => {
                attest(type("number&22").node).snap({
                    number: { value: 22 }
                })
            })
            it("float&number type", () => {
                attest(type("number&22.22").node).snap({
                    number: { value: 22.22 }
                })
            })
        })
        describe("string & literal", () => {
            it("string", () => {
                attest(type("string&'a'").node).snap({ string: { value: "a" } })
            })
        })
        it("list intersection", () => {
            const t = type([
                [{ a: "string" }, "[]"],
                "&",
                [{ b: "boolean" }, "[]"]
            ])
            attest(t.infer).typed as {
                a: string
                b: boolean
            }[]
            attest(t.node).snap({
                object: {
                    class: "(function Array)",
                    props: {
                        "[index]": {
                            object: { props: { a: "string", b: "boolean" } }
                        }
                    }
                }
            })
        })
        it("helper", () => {
            const t = intersection({ a: "string" }, { b: "boolean" })
            attest(t.infer).typed as {
                a: string
                b: boolean
            }
            attest(t.node).snap({
                object: { props: { a: "string", b: "boolean" } }
            })
        })
        describe("Tuple and Array", () => {
            it("string type", () => {
                const t = type([["string", "string"], "&", "string[]"])
                attest(t(["1", "1"]).data).snap(["1", "1"])
                attest(t(["1", 1]).problems?.summary).snap(
                    "Item at index 1 must be a string (was number)"
                )
            })
            it("multiple types with union array", () => {
                const t = type([["number", "string"], "&", "(string|number)[]"])
                attest(t.node).snap({
                    object: {
                        class: "(function Array)",
                        props: {
                            "0": "number",
                            "1": "string",
                            length: ["!", { number: { value: 2 } }]
                        }
                    }
                })
                attest(t([1, "1"]).data).snap([1, "1"])
                attest(t(["1", 1]).problems?.summary).snap(
                    "Item at index 0 must be a number (was string)\nItem at index 1 must be a string (was number)"
                )
            })
        })
        describe("errors", () => {
            it("bad reference", () => {
                // @ts-expect-error
                attest(() => type("boolean&tru")).throwsAndHasTypeError(
                    writeUnresolvableMessage("tru")
                )
            })
            it("double and", () => {
                // @ts-expect-error
                attest(() => type("boolean&&true")).throwsAndHasTypeError(
                    writeMissingRightOperandMessage("&", "&true")
                )
            })
            it("implicit never", () => {
                // @ts-expect-error
                attest(() => type("string&number")).throwsAndHasTypeError(
                    "results in an unsatisfiable type"
                )
            })
            it("helper parse", () => {
                attest(() =>
                    // @ts-expect-error
                    intersection({ a: "what" }, { b: "boolean" })
                ).throwsAndHasTypeError(writeUnresolvableMessage("what"))
            })
            it("helper implicit never", () => {
                attest(() => intersection("string", "number")).throws(
                    "results in an unsatisfiable type"
                )
            })
        })
    })
})
