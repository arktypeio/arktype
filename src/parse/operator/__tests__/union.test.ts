import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Operand } from "../../operand/operand.js"
import { Unenclosed } from "../../operand/unenclosed.js"
import type { Attributes } from "../../state/attributes.js"
import { union } from "../../state/union.js"

const testBranches: Attributes[] = [
    {
        type: "dictionary",
        paths: { a: { type: "string" }, c: { type: "bigint" } }
    },
    {
        type: "dictionary",
        paths: { a: { type: "string" }, c: { type: "number" } },
        requiredKeys: { a: true }
    },
    {
        type: "dictionary",
        paths: { a: { type: "number" }, b: { type: "boolean" } }
    }
]

const testBranches2: Attributes[] = [
    {
        type: "string",
        regex: "/a/"
    },
    {
        type: "number",
        regex: "/b/"
    },
    { type: "number", regex: "/c/" }
]

describe("union", () => {
    test("discriminate", () => {
        attest(union(testBranches2) as any).snap({ type: [[], [2], []] })
    })
    describe("infer", () => {
        test("two types", () => {
            attest(type("number|string").infer).typed as number | string
        })
        test("several types", () => {
            attest(type("false|null|undefined|0|''").infer).typed as
                | false
                | ""
                | 0
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                attest(() => type("number|strng")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("strng")
                )
            })
            test("consecutive tokens", () => {
                // @ts-expect-error
                attest(() => type("boolean||null")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "|null")
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                attest(() => type("boolean|")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "")
                )
            })
            test("long missing union member", () => {
                attest(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", ")|object")
                )
            })
        })
    })
})
