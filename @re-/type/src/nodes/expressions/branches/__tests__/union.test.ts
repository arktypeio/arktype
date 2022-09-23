import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space, type } from "../../../../index.js"

describe("union", () => {
    describe("validation", () => {
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
                    `Must be one of "yes"|"no" (was "maybe").`
                )
            })
            test("several types", () => {
                assert(type("2|4|6|8").check(5).errors?.summary).snap(
                    `Must be one of 2|4|6|8 (was 5).`
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
                        diagnostics: { union: { explainBranches: true } }
                    }).errors?.summary
                ).snap({} as any)
            })
        })
    })
    describe("creation", () => {
        test("prefers simple values", () => {
            assert(type("undefined|string").create()).is(undefined)
            assert(type("number|false|bigint").create() as any).is(false)
            assert(type("symbol|object").create()).equals({})
        })
        test("avoids ungeneratable", () => {
            assert(type("object|function").create()).equals({})
            assert(type("never|number|boolean").create()).equals(false)
        })
        test("prefers simple aliases", () => {
            const mySpace = space({
                five: "5",
                duck: "'duck'",
                nested: {}
            })
            assert(mySpace.$root.type("nested|five|duck").create()).is(5)
            assert(mySpace.$root.type("duck|nested").create()).is("duck")
        })
        test("creates onCycle values if needed", () => {
            const models = space({ a: { b: "b" }, b: { a: "a" } })
            const aOrB = models.$root.type("a|b")
            const created = aOrB.create({ onRequiredCycle: "cycle" })
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
            const created = aOrBOrSafe.create()
            assert(created).unknown.equals(false)
        })
    })
})
