import { assert } from "@re-/assert"
import { describe, test } from "mocha"

describe("snippets", () => {
    test("type", async () => {
        const modelSnippet = await import("../__snippets__/type.js")
        assert(modelSnippet.user.infer).typed as {
            name: string
            browser: {
                kind: "chrome" | "firefox" | "safari"
                version?: number | undefined
            }
        }
        assert(modelSnippet.errors?.summary).snap(
            `browser/kind must be one of "chrome"|"firefox"|"safari" (got "Internet Explorer").`
        )
    })
    test("space", async () => {
        const spaceSnippet = await import("../__snippets__/space.js")
        assert(spaceSnippet.types.package.infer).type.toString.snap(
            `{ name: string; dependencies: { name: string; dependencies: any[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: any[]; }[] | undefined; }[]; }[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }[] | undefined; }[]; }`
        )
        assert(spaceSnippet.errors?.summary)
            .snap(`Encountered errors at the following paths:
  dependencies/0/contributors: contributors is required.
  contributors/0/email: 'david@redodev' must be a valid email.
`)
    })
    test("constraints", async () => {
        const constraintsSnippet = await import(
            "../__snippets__/constraints.js"
        )
        assert(constraintsSnippet.errors?.summary)
            .snap(`Encountered errors at the following paths:
  email: 'david@redo.biz' must match expression /[a-z]*@redo.dev/.
  about/age: Must be at least 18 (got 17).
  about/bio: Must be at most 80 characters (got 110).
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
        assert(declarationSnippet.types.$root.ast).snap({
            user: {
                name: `string`,
                bestFriend: [`user`, `?`],
                groups: [`group`, `[]`]
            },
            group: { title: `string`, members: [`user`, `[]`] }
        })
    })
})
