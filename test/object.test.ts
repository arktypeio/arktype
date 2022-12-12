import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("struct", () => {
    test("record", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
        attest(o.root).snap({
            object: {
                props: {
                    a: "string",
                    b: {
                        object: {
                            kind: "Array",
                            propTypes: {
                                number: "boolean"
                            }
                        }
                    }
                },
                requiredKeys: {
                    a: true,
                    b: true
                }
            }
        })
    })
    test("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean[]" })
        attest(o.infer).typed as { a?: string; b: boolean[] }
        attest(o.root).snap({
            object: {
                props: {
                    a: "string",
                    b: {
                        object: {
                            kind: "Array",
                            propTypes: {
                                number: "boolean"
                            }
                        }
                    }
                },
                requiredKeys: {
                    b: true
                }
            }
        })
    })
})
