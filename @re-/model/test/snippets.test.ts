/* eslint-disable @typescript-eslint/no-unused-vars*/
import { assert } from "@re-/assert"
import { EquivalentType, error, user } from "../docs/snippets/model.js"
import { getValidatedPackageData, redo } from "../docs/snippets/space.js"
import { model } from "../src/index.js"

describe("snippets", () => {
    it("model", () => {
        assert(user.type).typed as EquivalentType
        assert(error?.message).snap(
            `At path browser, "Internet Explorer" is not assignable to any of 'chrome'|'firefox'|'other'|null.`
        )
    })
    it("space", () => {
        assert(redo.types.package).type.toString.snap(
            `{ name: string; version: string; dependencies: { name: string; version: string; dependencies: any[]; contributors: { name: string; isInternal: boolean; packages: { name: string; version: string; dependencies: any[]; contributors: any[]; }[]; }[]; }[]; contributors: { name: string; isInternal: boolean; packages: { name: string; version: string; dependencies: any[]; contributors: { name: string; isInternal: boolean; packages: any[]; }[]; }[]; }[]; }`
        )
        assert(() => getValidatedPackageData()).throws
            .snap(`Error: Encountered errors at the following paths:
  dependencies/0/version: 2.2 is not assignable to string.
  dependencies/0/contributors: Required value of type contributor[] was missing.
  contributors/0/packages: Required value of type package[] was missing.
`)
    })
    // See multifile.assert.ts for declaration demo
    it("constraints", () => {
        const employee = model({
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
  about/age: 17 is less than 18.
  about/bio: "I am very interesting.I am very interesting.I am ..." is greater than 160 characters.
`)
    })
})
