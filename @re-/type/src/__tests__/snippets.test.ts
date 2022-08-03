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
        assert(modelSnippet.error?.message).snap(
            `At path browser/kind, "Internet Explorer" is not assignable to any of 'chrome'|'firefox'|'safari'.`
        )
    })
    test("space", async () => {
        const spaceSnippet = await import("../../docs/snippets/space.js")
        assert(spaceSnippet.redo.$root.infer.package).type.toString.snap(
            `{ name: string; dependencies: { name: string; dependencies: any[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: any[]; }[] | undefined; }[]; }[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }[] | undefined; }[]; }`
        )
        assert(spaceSnippet.getValidatedPackageData).throws
            .snap(`Encountered errors at the following paths:
  dependencies/0/contributors: Required value of type contributor[] was missing.
  contributors/0/email: "david@redodev" is not assignable to email.
`)
    })
    // See multifile.assert.ts for declaration demo
    test("constraints", () => {
        const employee = type({
            // Not a fan of regex? Don't worry, 'email' is a builtin type :)
            email: /[a-z]*@redo\.dev/,
            about: {
                // Single or double bound numeric types
                age: "18<=integer<125",
                // Or string lengths
                bio: "string<=160"
            }
        })

        // But enforce their original definition during validation
        const { error } = employee.validate({
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
        assert(error?.message).snap(`Encountered errors at the following paths:
      email: "david@redo.biz" does not match expression /[a-z]*@redo\\.dev/.
      about/age: Must be greater than or equal to 18 (got 17).
      about/bio: Must be less than or equal to 160 characters (got 220).
    `)
    })
})
