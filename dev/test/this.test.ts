import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("parse array", () => {
    it("parse", () => {
        const t = type({ box: "this" })
        attest(t.infer).typed as { box: any }
        attest(t.node).equals({
            object: {
                instance: Array,
                props: { "[index]": "string" }
            }
        })
    })
})
