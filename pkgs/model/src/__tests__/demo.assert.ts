import { assert } from "@re-/assert"
import { create, compile } from "@re-/model"

describe("demo", () => {
    test("model", () => {
        // Most common TypeScript expressions just work...
        const user = create({
            name: {
                first: "string",
                middle: "string?",
                last: "string"
            },
            age: "number",
            browser: "'chrome'|'firefox'|'other'|null"
        })

        // If you're using TypeScript, you can create your type...
        type User = typeof user.type

        // But a model can also validate your data at runtime...
        const { error } = user.validate({
            name: {
                first: "Reed",
                last: "Doe"
            },
            age: 28,
            browser: "Internet Explorer" // :(
        })
        assert(user.type).typed as {
            name: {
                middle?: string | undefined
                first: string
                last: string
            }
            age: number
            browser: "chrome" | "firefox" | "other" | null
        }
        assert(error).is(
            "At path browser, 'Internet Explorer' is not assignable to any of 'chrome'|'firefox'|'other'|null."
        )
    })
    test("space", () => {
        const space = compile({
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
        type User = typeof space.types.user

        // Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
        assert(() =>
            space.models.user.assert({
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
        assert(space.types.user).type.toString.snap(
            `"{ bestFriend?: { bestFriend?: any | undefined; name: string; groups: { members: { bestFriend?: any | undefined; name: string; groups: any[]; }[]; title: string; }[]; } | undefined; name: string; groups: { members: { bestFriend?: any | undefined; name: string; groups: { members: any[]; title: string; }[]; }[]; title: string; }[]; }"`
        )
    })
    // See multifile.assert.ts for declaration demo
    test("constraints", () => {
        const employee = create({
            // Not a fan of regex? Don't worry, 'email' is a builtin type :)
            email: `/[a-z]*@redo\.dev/`,
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
        assert(error).snap(`
"Encountered errors at the following paths:
{
  email: ''david@redo.biz' is not assignable to /[a-z]*@redo.dev/.',
  about/age: '17 was less than 18.',
  about/bio: ''I am very interesting.I am very interesting.I am... was greater than 160 characters.'
}"
`)
    })
})
