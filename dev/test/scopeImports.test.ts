import { suite, test } from "mocha"
import { scope } from "../../src/main.js"
import { writeDuplicateAliasesMessage } from "../../src/scope.js"
import { attest } from "../attest/main.js"
import { lazily } from "./utils.js"

suite("space destructuring", () => {
    const threeSixtyNoScope = lazily(() =>
        scope({
            three: "3",
            sixty: "60",
            no: "'no'"
        })
    )
    const yesScope = lazily(() => scope({ yes: "'yes'" }))

    const threeSixtyNoSpace = lazily(() => threeSixtyNoScope.compile())
    const yesSpace = lazily(() => yesScope.compile())

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

        const imported = scope({
            ...base.import(),
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
                .compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
})
