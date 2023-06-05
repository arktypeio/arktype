import { suite, test } from "mocha"
import type { TypeSet } from "../../src/main.js"
import { scope } from "../../src/main.js"
import type { Generic } from "../../src/scope.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"

suite("visibility", () => {
    test("private", () => {
        const types = scope({
            foo: "bar[]",
            "#bar": "boolean"
        }).export()
        attest(types).typed as TypeSet<{
            exports: { foo: boolean[] }
            locals: { bar: boolean }
            ambient: Ark
        }>
    })
    test("private generic", () => {
        const types = scope({
            foo: "bar<string>[]",
            "#bar<t>": ["t"]
        }).export()
        attest(types).typed as TypeSet<{
            exports: { foo: [string][] }
            locals: { bar: Generic<["t"], ["t"]> }
            ambient: Ark
        }>
    })
    test("ambient", () => {
        const types = scope({
            foo: "bar[]",
            "ambient bar": "boolean"
        }).export()
        attest(types).typed as TypeSet<{
            exports: { foo: boolean[] }
            locals: {}
            ambient: Ark & { bar: boolean }
        }>
    })
    test("ambient generic", () => {
        const types = scope({
            foo: "bar<string>[]",
            "ambient bar<t>": ["t"]
        }).export()
        attest(types).typed as TypeSet<{
            exports: { foo: [string][] }
            locals: {}
            ambient: Ark & { bar: Generic<["t"], ["t"]> }
        }>
    })
})
