import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../index.js"

describe("snippets", () => {
    test("model", async () => {
        const modelSnippet = await import("../../docs/snippets/type.js")
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
        const spaceSnippet = await import("../../docs/snippets/space.js")
        assert(spaceSnippet.models.package.infer).type.toString.snap(
            `{ name: string; dependencies: { name: string; dependencies: any[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: any[]; }[] | undefined; }[]; }[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }[] | undefined; }[]; }`
        )
        assert(spaceSnippet.errors?.summary)
            .snap(`Encountered errors at the following paths:
  dependencies/0/contributors: Missing required value of type contributor[].
  contributors/0/email: "david@redodev" is not assignable to email.
`)
    })
    test("constraints", () => {
        const employee = type({
            // Not a fan of regex? Don't worry, 'email' is a builtin type :)
            email: `/[a-z]*@redo.dev/`,
            about: {
                // Single or double bound numeric types
                age: "18<=integer<125",
                // Or string lengths
                bio: "string<=160"
            }
        })

        // But enforce their original definition during validation
        const { errors: error } = employee.check({
            email: "david@redo.biz",
            about: {
                age: 17,
                bio: "I am very interesting.".repeat(10)
            }
        })
        assert(employee.infer).typed as {
            email: string
            about: {
                age: number
                bio: string
            }
        }
        assert(error?.summary).snap(`Encountered errors at the following paths:
  email: 'david@redo.biz' does not match expression /[a-z]*@redo.dev/.
  about/age: 17 must be greater than or equal to 18.
  about/bio: "I am very interesting.I am very interesting.I am ..." must be less than or equal to 160 characters (was 220).
`)
    })
    // TODO: Reuse more from actual snippets
})
