import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildImplicitNeverMessage } from "../src/parse/string/ast.ts"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/string/shift/operand/unenclosed.ts"

describe("intersection", () => {
    describe("parse", () => {
        it("two types", () => {
            const t = type("boolean&true")
            attest(t.infer).typed as true
            attest(t.node).snap({ boolean: { value: true } })
        })
        it("email", () => {
            const t = type("email&/@arktype.io$/")
            attest(t.infer).typed as true
            attest(t("shawn@arktype.io").data).snap("shawn@arktype.io")
            attest(t("shawn@arkype.com").problems?.summary).snap(
                '"shawn@arkype.com" must match expression /@arktype.io$/.'
            )
        })
        it("several types", () => {
            const t = type("unknown&boolean&false")
            attest(t.infer).typed as false
            attest(t.node).snap({ boolean: { value: false } })
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
                    subdomain: [
                        "Array",
                        { object: { props: { a: "string", b: "boolean" } } }
                    ]
                }
            })
        })
        describe("errors", () => {
            it("bad reference", () => {
                // @ts-expect-error
                attest(() => type("boolean&tru")).throwsAndHasTypeError(
                    buildUnresolvableMessage("tru")
                )
            })
            it("double and", () => {
                // @ts-expect-error
                attest(() => type("boolean&&true")).throwsAndHasTypeError(
                    buildMissingRightOperandMessage("&", "&true")
                )
            })
            it("implicit never", () => {
                // @ts-expect-error
                attest(() => type("string&number")).throwsAndHasTypeError(
                    buildImplicitNeverMessage("")
                )
            })
        })
    })
})
