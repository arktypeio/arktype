import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space, type } from "../../../index.js"

describe("union node", () => {
    describe("check", () => {
        test("two types", () => {
            assert(type("true|false").check(false).errors).is(undefined)
        })
        test("several types", () => {
            assert(
                type("0|false|undefined|null|'zero'|void").check("zero").errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("two types", () => {
                assert(type("'yes'|'no'").check("maybe").errors?.summary).snap(
                    `Must be one of 'yes'|'no' (was "maybe")`
                )
            })
            test("several types", () => {
                assert(type("2|4|6|8").check(5).errors?.summary).snap(
                    `Must be one of 2|4|6|8 (was 5)`
                )
            })
            test("explainBranches", () => {
                assert(
                    space({
                        a: "b|c",
                        b: "d|e",
                        c: "f|g",
                        d: "0",
                        e: "1",
                        f: "2",
                        g: "3"
                    }).a.check(4, {
                        errors: { union: { explainBranches: true } }
                    }).errors?.summary
                ).snap(`Must be one of b|c (was 4):
b: Must be one of d|e (was 4):
d: Must be 0 (was 4)
e: Must be 1 (was 4)
c: Must be one of f|g (was 4):
f: Must be 2 (was 4)
g: Must be 3 (was 4)`)
            })
        })
    })
    describe("generate", () => {
        test("prefers simple values", () => {
            assert(type("undefined|string").generate()).is(undefined)
            assert(type("number|false|bigint").generate() as any).is(false)
            assert(type("symbol|object").generate()).equals({})
        })
        test("avoids ungeneratable", () => {
            assert(type("object|function").generate()).equals({})
            assert(type("never|number|boolean").generate()).equals(false)
        })
        test("prefers simple aliases", () => {
            const mySpace = space({
                five: "5",
                duck: "'duck'",
                nested: {}
            })
            assert(mySpace.$root.type("nested|five|duck").generate()).is(5)
            assert(mySpace.$root.type("duck|nested").generate()).is("duck")
        })
        test("creates onCycle values if needed", () => {
            const models = space({ a: { b: "b" }, b: { a: "a" } })
            const aOrB = models.$root.type("a|b")
            const created = aOrB.generate({ onRequiredCycle: "cycle" })
            assert(created).unknown.equals({
                b: { a: "cycle" }
            })
        })
        test("avoids required cycles if possible", () => {
            const models = space({
                a: { b: "b" },
                b: { a: "a" },
                safe: "false"
            })
            const aOrBOrSafe = models.$root.type("a|b|safe")
            const created = aOrBOrSafe.generate()
            assert(created).unknown.equals(false)
        })
    })
})
