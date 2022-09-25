import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space } from "../../../index.js"
import { unresolvableMessage } from "../../../parser/str/operand/unenclosed.js"

describe("meta", () => {
    // TODO: Add tests for runtime behavior....
    test("with onResolve option", () => {
        const types = space(
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
        const withOnResolve = types.$root.type({
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
            space({ a: { a: "a" }, s: "string" }, { parse: { onResolve: "s" } })
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
            space({}, { parse: { onResolve: "fake" } })
        ).type.errors(unresolvableMessage("fake"))
    })
    test("doesn't allow meta-only defs outside meta", () => {
        // @ts-expect-error
        assert(() => space({ a: "$resolution" })).throwsAndHasTypeError(
            unresolvableMessage("$resolution")
        )
    })
})
