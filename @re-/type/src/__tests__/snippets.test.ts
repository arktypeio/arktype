import { assert } from "@re-/assert"
import { describe, test } from "mocha"

describe("snippets", () => {
    test("model", async () => {
        const modelSnippet = await import("../__snippets__/type.js")
        assert(modelSnippet.user.infer).typed as {
            name: string
            browser: {
                kind: "chrome" | "firefox" | "safari"
                version?: number | undefined
            }
        }
        assert(modelSnippet.errors?.summary).snap(
            `At path browser/kind, "Internet Explorer" is not assignable to any of 'chrome'|'firefox'|'safari'.`
        )
    })
    test("space", async () => {
        const spaceSnippet = await import("../__snippets__/space.js")
        assert(spaceSnippet.types.package.infer).type.toString.snap(
            `{ name: string; dependencies: { name: string; dependencies: any[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: any[]; }[] | undefined; }[]; }[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }[] | undefined; }[]; }`
        )
        assert(spaceSnippet.errors?.summary)
            .snap(`Encountered errors at the following paths:
  dependencies/0/contributors: Missing required value of type contributor[].
  contributors/0/email: "david@redodev" is not assignable to email.
`)
    })
    test("constraints", async () => {
        const constraintsSnippet = await import(
            "../__snippets__/constraints.js"
        )
        assert(constraintsSnippet.errors?.summary)
            .snap(`Encountered errors at the following paths:
  email: 'david@redo.biz' does not match expression /[a-z]*@redo.dev/.
  about/age: 17 must be greater than or equal to 18.
  about/bio: "I am very interesting.I am very interesting.I am ..." must be less than or equal to 80 characters (was 110).
`)
        assert(constraintsSnippet.employee.infer).typed as {
            email: string
            about: {
                age: number
                bio: string
            }
        }
    })
    test("declaration", async () => {
        const declarationSnippet = await import(
            "../__snippets__/declaration/declaration.js"
        )
        assert(
            declarationSnippet.types.group.infer.members[0].groups[0].members[0]
                .name
        ).typed as string
        assert(declarationSnippet.types.$root.tree).snap({
            user: {
                name: `string`,
                bestFriend: [`user`, `?`],
                groups: [`group`, `[]`]
            },
            group: { title: `string`, members: [`user`, `[]`] }
        })
    })
})
