import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import type { Module } from "../../src/scope.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"
import { lazily } from "../utils/src/main.js"

suite("scope imports", () => {
    const threeSixtyNoScope = lazily(() =>
        scope({
            three: "3",
            sixty: "60",
            no: "'no'"
        })
    )
    const yesScope = lazily(() => scope({ yes: "'yes'" }))

    const threeSixtyNoModule = lazily(() => threeSixtyNoScope.export())
    const yesModule = lazily(() => yesScope.export())

    test("single", () => {
        const $ = scope({
            ...threeSixtyNoModule
        }).scope({ threeSixtyNo: "three|sixty|no" })
        attest($.infer).typed as {
            threeSixtyNo: 3 | 60 | "no"
        }
    })

    test("multiple", () => {
        const base = scope({
            ...threeSixtyNoModule,
            ...yesModule,
            extra: "true"
        })

        const imported = base.scope({
            a: "three|sixty|no|yes|extra"
        })

        attest(imported.infer).typed as {
            a: 3 | 60 | "no" | "yes" | true
        }
    })

    // TODO: fix, tests for more duplicate scenarios
    // test("duplicate alias", () => {
    //     attest(() =>
    //         scope({ a: "boolean" })
    //             .scope(
    //                 // @ts-expect-error
    //                 { a: "string" }
    //             )
    //             .export()
    //     ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    // })

    test("import & export", () => {
        const threeSixtyNoScope = scope({
            three: "3",
            sixty: "60",
            no: "'no'"
        })

        const scopeCreep = scope({
            hasCrept: "true"
        })

        const outOfScope = scope({
            ...threeSixtyNoScope.import("three", "no"),
            ...scopeCreep.export(),
            public: "hasCrept|three|no|private",
            "#private": "uuid"
        }).export()

        attest(Object.keys(outOfScope)).equals(["hasCrept", "public"])

        attest(outOfScope.public.condition).equals(
            type("3|'no'|uuid|true").condition
        )

        attest(outOfScope).typed as Module<{
            exports: {
                hasCrept: true
                public: string | true | 3
            }
            locals: {
                three: 3
                no: "no"
                private: string
            }
            ambient: Ark
        }>
    })
})

suite("private aliases", () => {
    test("non-generic", () => {
        const types = scope({
            foo: "bar[]",
            "#bar": "boolean"
        }).export()
        attest(Object.keys(types)).equals(["foo"])
        attest(types.foo.condition).equals(type("boolean[]").condition)
        attest(types).typed as Module<{
            exports: { foo: boolean[] }
            locals: { bar: boolean }
            ambient: Ark
        }>
    })
    test("generic", () => {
        const types = scope({
            foo: "bar<string>[]",
            "#bar<t>": ["t"]
        }).export()
        attest(types.foo).typed as [string][]
    })
})
