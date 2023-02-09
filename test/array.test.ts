import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { incompleteArrayTokenMessage } from "../src/parse/string/shift/operator/operator.ts"

describe("parse array", () => {
    it("parse", () => {
        const t = type("string[]")
        attest(t.infer).typed as string[]
        attest(t.node).snap({
            object: { class: "Array", props: { "[index]": "string" } }
        })
        attest(t.flat).snap([
            ["class", "Array"],
            ["props", { index: "string" }]
        ])
    })
    it("array intersection", () => {
        const t = type([[{ a: "string" }, "[]"], "&", [{ b: "number" }, "[]"]])
        attest(t.node).snap({
            object: {
                class: "Array",
                props: {
                    "[index]": {
                        object: { props: { a: "string", b: "number" } }
                    }
                }
            }
        })
        attest(t.flat).snap([
            ["class", "Array"],
            [
                "props",
                {
                    index: [
                        ["domain", "object"],
                        [
                            "props",
                            {
                                required: [
                                    ["a", "string"],
                                    ["b", "number"]
                                ]
                            }
                        ]
                    ]
                }
            ]
        ])
    })

    describe("errors", () => {
        it("incomplete token", () => {
            // @ts-expect-error
            attest(() => type("string[")).throwsAndHasTypeError(
                incompleteArrayTokenMessage
            )
        })
    })
})
