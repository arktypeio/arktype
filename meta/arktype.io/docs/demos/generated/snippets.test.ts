export default `import { assert } from "@arktype/check"
import { describe, test } from "mocha"

describe("snippets", () => {
    test("type", async () => {
        const typeSnippet = await import("../type")
        assert(typeSnippet.user.infer).typed as {
            name: string
            browser: {
                kind: "chrome" | "firefox" | "safari"
                version?: number | undefined
            }
        }
        assert(typeSnippet.problems?.summary).snap(
            \`browser/kind must be one of 'chrome'|'firefox'|'safari' (was "Internet Explorer")\`
        )
    })
    test("space", async () => {
        const spaceSnippet = await import("../space")
        assert(spaceSnippet.types.package.infer).type.toString.snap(
            "{ name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }"
        )
        assert(spaceSnippet.problems?.summary)
            .snap(\`dependencies/0/contributors: contributors is required
contributors/0/email: Must be a valid email (was "david@araktypeio")\`)
    })
    test("constraints", async () => {
        const constraintsSnippet = await import("../constraints")
        assert(constraintsSnippet.problems?.summary)
            .snap(\`email: Must match expression /[a-z]*@arktype.io/ (was "david@arktype.biz")
about/age: Must be at least 18 (was 17)
about/bio: Must be at most 80 characters (was 110)\`)
        assert(constraintsSnippet.employee.infer).typed as {
            email: string
            about: {
                age: number
                bio: string
            }
        }
    })
    // TODO: Reenable
    // test("declaration", async () => {
    //     const declarationSnippet = await import("../declaration/declaration")
    //     assert(
    //         declarationSnippet.types.group.infer.members[0].groups[0].members[0]
    //             .name
    //     ).typed as string
    //     assert(declarationSnippet.types.$.toAst()).snap({
    //         user: {
    //             name: \`string\`,
    //             bestFriend: [\`user\`, \`?\`],
    //             groups: [\`group\`, \`[]\`]
    //         },
    //         group: { title: \`string\`, members: [\`user\`, \`[]\`] }
    //     })
    // })
})
`
