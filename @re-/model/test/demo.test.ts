/* eslint-disable @typescript-eslint/no-unused-vars*/
import { assert } from "@re-/assert"
import { error, IsEquivalentTo, user } from "../snippets/model.js"
import { model, space } from "../src/index.js"

describe("snippets", () => {
    it("model", () => {
        assert(user.type).typed as IsEquivalentTo
        assert(error?.message).is(
            "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
        )
    })
    it("space", () => {
        const mySpace = space({
            user: {
                name: "string",
                bestFriend: "user?",
                groups: "group[]"
            },
            group: {
                title: "string",
                members: "user[]"
            }
        })

        // Typescript types can be extracted like this
        type User = typeof mySpace.types.user

        // Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
        assert(() =>
            mySpace.models.user.assert({
                name: "Devin Aldai",
                bestFriend: {
                    name: "Devin Olnyt",
                    groups: [{ title: "Type Enjoyers" }]
                },
                groups: []
            })
        ).throws(
            "At path bestFriend/groups/0, required keys 'members' were missing."
        )
        assert(mySpace.types.user).type.toString.snap(
            `{ name: string; groups: { title: string; members: { name: string; groups: { title: string; members: any[]; }[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: { name: string; groups: { title: string; members: { name: string; groups: any[]; bestFriend?: any | undefined; }[]; }[]; bestFriend?: any | undefined; } | undefined; }`
        )
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
        assert(error).snap(`Encountered errors at the following paths:
  email: 'david@redo.biz' does not match expression /[a-z]*@redo\\.dev/.
  about/age: 17 is less than 18.
  about/bio: 'I am very interesting.I am very interesting.I am ...' is greater than 160 characters.
`)
    })
})
