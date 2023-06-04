import { suite, test } from "mocha"
import type { Space } from "../../src/main.js"
import { scope } from "../../src/main.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"

suite("private aliases", () => {
    test("non-generic", () => {
        const types = scope({
            foo: "bar[]",
            "#bar": "boolean"
        })
        attest(types).typed as Space<{ foo: boolean[] }, { bar: boolean }, Ark>
    })
})
