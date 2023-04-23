import { describe, it } from "mocha"
import { intersection, type } from "#arktype"
import { attest } from "#attest"
import type { Node } from "#internal/nodes/node.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "#internal/parse/string/shift/operand/unenclosed.js"

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
        it("multiple valid types", () => {
            const t = type("email&lowercase<5")
            attest(t("ShawnArktype.io").problems?.summary).snap(
                "'ShawnArktype.io' must be...\n• a string matching /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/\n• a string matching /^[a-z]*$/\n• less than 5 characters"
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
        it("tuple intersection", () => {
            const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
            attest(t.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
            attest(t.node).snap({
                object: {
                    class: "(function Array)",
                    props: {
                        "0": {
                            object: { props: { a: "string", b: "boolean" } }
                        },
                        length: ["!", { number: { value: 1 } }]
                    }
                }
            })
        })
        it("mixed tuple intersection", () => {
            const tupleAndArray = type([
                [{ a: "string" }],
                "&",
                [{ b: "boolean" }, "[]"]
            ])
            const arrayAndTuple = type([
                [{ b: "boolean" }, "[]"],
                "&",
                [{ a: "string" }]
            ])
            attest(tupleAndArray.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
            attest(arrayAndTuple.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
            const expectedNode: Node = {
                object: {
                    class: Array,
                    props: {
                        "0": {
                            object: { props: { a: "string", b: "boolean" } }
                        },
                        length: ["!", { number: { value: 1 } }]
                    }
                }
            }
            attest(tupleAndArray.node).equals(expectedNode)
            attest(arrayAndTuple.node).equals(expectedNode)
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
        it("string type", () => {
            const t = type([["string", "string"], "&", "alpha[]"])
            attest(t.node).snap({
                object: {
                    class: "(function Array)",
                    props: {
                        "0": "alpha",
                        "1": "alpha",
                        length: ["!", { number: { value: 2 } }]
                    }
                }
            })
            attest(t(["1", 1]).problems?.summary).snap(
                "Item at index 0 must be only letters (was '1')\nItem at index 1 must be only letters (was number)"
            )
        })
        it("multiple types with union array", () => {
            const t = type([["number", "string"], "&", "('one'|1)[]"])
            attest(t.node).snap({
                object: {
                    class: "(function Array)",
                    props: {
                        "0": { number: { value: 1 } },
                        "1": { string: { value: "one" } },
                        length: ["!", { number: { value: 2 } }]
                    }
                }
            })
        })
        describe("errors", () => {
            it("bad reference", () => {
                // @ts-expect-error
                attest(() => type("boolean&tru"))
                    .throws(writeUnresolvableMessage("tru"))
                    .type.errors("boolean&true")
            })
            it("double and", () => {
                // @ts-expect-error
                attest(() => type("boolean&&true")).throws(
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
