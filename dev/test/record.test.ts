import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("record", () => {
    test("empty", () => {
        const o = type({})
        attest(o.root).equals(type("object").root)
    })
    test("required", () => {
        const o = type({ a: "string", b: "boolean" })
        attest(o.infer).typed as { a: string; b: boolean }
    })
    test("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean" })
        attest(o.infer).typed as { a?: string; b: boolean }
        attest(o.root.key)
            .snap(`((typeof $arkRoot === "object" && $arkRoot !== null) || typeof $arkRoot === "function") && !('a' in $arkRoot) || typeof $arkRoot.a === "string" && (() => {
        switch($arkRoot.b) {
            case true: {
                return true;
            }case false: {
                return true;
            }
        }
    })()`)
    })
    test("traverse optional", () => {
        const o = type({ "a?": "string" }, { keys: "strict" })
        attest(o({ a: "a" }).data).snap({ a: "a" })
        attest(o({}).data).snap({})
        attest(o({ a: 1 }).problems?.summary).snap(
            "a must be a string (was number)"
        )
    })
    test("intersection", () => {
        const t = type({ a: "number" }).and({ b: "boolean" })
        // Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
        attest(t.infer).types.toString.snap("{ a: number; b: boolean; }")
    })
    test("escaped optional token", () => {
        const t = type({ "a\\?": "string" })
        attest(t.infer).typed as { "a?": string }
    })
    test("multiple bad strict", () => {
        const t = type({ a: "string", b: "boolean" }, { keys: "strict" })
        attest(t({ a: 1, b: 2 }).problems?.summary).snap(
            "a must be a string (was number)\nb must be boolean (was number)"
        )
    })
})
