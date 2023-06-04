import { suite, test } from "mocha"
import { scope } from "../../src/main.js"
import type { Scope, Space } from "../../src/scope.js"
import { writeDuplicateAliasesMessage } from "../../src/scope.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"
import { lazily } from "./utils.js"

suite("scope imports", () => {
    const threeSixtyNoScope = lazily(() =>
        scope({
            three: "3",
            sixty: "60",
            no: "'no'"
        })
    )
    const yesScope = lazily(() => scope({ yes: "'yes'" }))

    const threeSixtyNoSpace = lazily(() => threeSixtyNoScope.export())
    const yesSpace = lazily(() => yesScope.export())

    test("single", () => {
        const $ = scope({
            ...threeSixtyNoSpace
        }).scope({ threeSixtyNo: "three|sixty|no" })
        attest($.infer).typed as {
            threeSixtyNo: 3 | 60 | "no"
        }
    })

    test("multiple", () => {
        const base = scope({
            ...threeSixtyNoSpace,
            ...yesSpace,
            extra: "true"
        })

        const imported = base.scope({
            a: "three|sixty|no|yes|extra"
        })

        attest(imported.infer).typed as {
            a: 3 | 60 | "no" | "yes" | true
        }
    })

    test("duplicate alias", () => {
        attest(() =>
            scope({ a: "boolean" })
                .scope(
                    // @ts-expect-error
                    { a: "string" }
                )
                .export()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })

    test("import & export", () => {
        const importedBase = scope({
            importedAlias: "string"
        })
        const exportedBase = scope({
            exportedAlias: "boolean"
        })
        const imported = scope({
            ...importedBase.import(),
            ...exportedBase.export(),
            public: "importedAlias|exportedAlias|private",
            "#private": "number"
        })
        attest(imported).typed as Scope<
            {
                exportedAlias: boolean
                public: string | number | boolean
            },
            {
                importedAlias: string
                private: number
            },
            Ark
        >
    })
})

suite("private aliases", () => {
    test("non-generic", () => {
        const types = scope({
            foo: "bar[]",
            "#bar": "boolean"
        }).export()
        attest(types).typed as Space<{ foo: boolean[] }, { bar: boolean }, Ark>
    })
})
