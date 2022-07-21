/* eslint-disable @typescript-eslint/no-unused-vars*/
import { assert } from "@re-/assert"
import * as spaceSnippet from "../docs/snippets/space.js"
import * as modelSnippet from "../docs/snippets/type.js"
import { type } from "../src/index.js"

describe("snippets", () => {
    it("model", () => {
        assert(modelSnippet.user.type).typed as {
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
    it("space", () => {
        assert(spaceSnippet.redo.$meta.types.package).type.toString.snap(
            `{ name: string; dependencies: { name: string; dependencies: any[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: any[]; }[] | undefined; }[]; }[]; contributors: { email: string; packages?: { name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }[] | undefined; }[]; }`
        )
        assert(spaceSnippet.getValidatedPackageData).throws
            .snap(`Encountered errors at the following paths:
  dependencies/0/contributors: Required value of type contributor[] was missing.
  contributors/0/email: "david@redodev" is not assignable to email.
`)
    })
    // See multifile.assert.ts for declaration demo
    it("constraints", () => {
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

        // Subtypes like 'email' and 'integer' become 'string' and 'number'
        type Employee = typeof employee.type

        // But enforce their original definition during validation
        const { error } = employee.validate({
            email: "david@redo.biz",
            about: {
                age: 17,
                bio: "I am very interesting.".repeat(10)
            }
        })
        assert(employee.type).typed as {
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
