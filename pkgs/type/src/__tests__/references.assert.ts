import { assert } from "@re-do/assert"
import { References } from ".."

describe("references", () => {
    test("extract types referenced from string", () => {
        assert({} as References<"(user[],group[])=>boolean|number|null">)
            .typed as "number" | "boolean" | "user" | "group" | "null"
        assert(
            {} as References<
                "(user[],group[])=>boolean|number|null",
                { asList: true }
            >
        ).typed as ["boolean", "number", "null", "user", "group"]
    })
    test("extract base names of object", () => {
        const refs = {} as References<{
            a: { b: { c: "user[]?" } }
            listed: ["group|null", "user|null", "(string, number)=>function"]
        }>
        assert(refs).typed as {
            a: {
                b: {
                    c: "user"
                }
            }
            listed: [
                "group" | "null",
                "user" | "null",
                "string" | "number" | "function"
            ]
        }
    })
})
