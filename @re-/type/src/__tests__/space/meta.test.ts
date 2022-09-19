import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space } from "../../index.js"
import { unresolvableMessage } from "../../parser/operand/unenclosed.js"

describe("meta", () => {
    // TODO: Add tests for runtime behavior....
    test("with onCycle option", () => {
        const models = space(
            {
                a: { b: "b", isA: "true", isB: "false" },
                b: { a: "a", isA: "false", isB: "true" }
            },
            {
                parse: {
                    onCycle: {
                        cyclic: "$cyclic?"
                    }
                }
            }
        )
        const cyclicModel = models.$root.type({
            a: "a",
            b: "b"
        })
        assert(cyclicModel.infer.a.b.a.cyclic).type.toString.snap(
            `{ b: { a: { b: { cyclic?: { a: { b: { a: { cyclic?: { b: { a: { b: any; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined`
        )
        assert(cyclicModel.infer.b.a.b.cyclic).type.toString.snap(
            `{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined`
        )
        assert(cyclicModel.infer.a.b.a.cyclic?.b.a.b.cyclic).type.toString.snap(
            `{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined`
        )
    })
    test("with onResolve option", () => {
        const models = space(
            {
                a: { b: "b", isA: "true", isB: "false" },
                b: { a: "a", isA: "false", isB: "true" }
            },
            {
                parse: {
                    onResolve: {
                        wasResolved: "true",
                        resolvedType: "$resolution"
                    }
                }
            }
        )
        const withOnResolve = models.$root.type({
            referencesA: "a",
            noReferences: {
                favoriteSoup: "'borscht'"
            }
        })
        assert(withOnResolve.infer.referencesA.wasResolved).typed as true
        assert(withOnResolve.infer.referencesA.resolvedType.b.wasResolved)
            .typed as true
        // @ts-expect-error
        assert(withOnResolve.infer.noReferences.wasResolved).type.errors(
            "Property 'wasResolved' does not exist on type '{ favoriteSoup: \"borscht\"; }'."
        )
    })
    test("allows non-meta references within meta", () => {
        assert(
            space({ a: { a: "a" }, s: "string" }, { parse: { onCycle: "s" } })
                .$root.infer
        ).typed as {
            a: {
                a: string
            }
            s: string
        }
    })
    test("type error on bad meta key", () => {
        // @ts-expect-error
        assert(space({}, { parse: { fake: "boolean" } })).type.errors(
            `'fake' does not exist in type`
        )
    })
    test("errors on bad meta def", () => {
        assert(() =>
            // @ts-expect-error
            space({}, { parse: { onCycle: "fake" } })
        ).type.errors(unresolvableMessage("fake"))
    })
    test("doesn't allow meta-only defs outside meta", () => {
        // @ts-expect-error
        assert(() => space({ a: "$cyclic" })).throwsAndHasTypeError(
            unresolvableMessage("$cyclic")
        )
    })
    test("doesn't allow key-specific meta references in other meta keys", () => {
        assert(() =>
            // @ts-expect-error
            space({}, { parse: { onCycle: "$resolution" } })
        ).type.errors(unresolvableMessage("$resolution"))
    })
})
