import { assert } from "@re-/assert"
import { create, CustomValidator } from "@re-/model"
import { compile } from "../space.js"

describe("custom validators", () => {
    const validator: CustomValidator = (value) => {
        if (
            typeof value === "string" &&
            value === [...value].reverse().join("")
        ) {
            return ""
        }
        return `${value} is not a palindrome!`
    }
    test("inline", () => {
        const palindrome = create("string", {
            validate: { validator }
        })
        assert(palindrome.validate("amanaplanacanalpanama").errors).is(
            undefined
        )
        assert(palindrome.validate("ssalbdivad").errors).is(
            `ssalbdivad is not a palindrome!`
        )
    })
    test("model root", () => {
        const space = compile(
            { palindrome: "string" },
            { models: { palindrome: { validate: { validator } } } }
        )
        assert(space.models.palindrome.validate("redivider").errors).is(
            undefined
        )
        assert(space.models.palindrome.validate("predivider").errors).is(
            `predivider is not a palindrome!`
        )
    })
    test("model nested", () => {
        const space = compile(
            { palindrome: "string", yourPal: { name: "palindrome" } },
            {
                models: {
                    palindrome: {
                        validate: { validator }
                    }
                }
            }
        )
        assert(space.models.yourPal.validate({ name: "bob" }).errors).is(
            undefined
        )
        assert(space.models.yourPal.validate({ name: "rob" }).errors).snap(
            `"At path name, rob is not a palindrome!"`
        )
    })
    test("space", () => {
        const space = compile(
            { first: "string", second: { comesAfter: "first" } },
            {
                validate: {
                    validator: (value, errors, { def }) => {
                        if (def === "first") {
                            return { ...errors, "from/first": "test" }
                        } else if (def === "second") {
                            return { ...errors, "from/second": "hi" }
                        }
                        return { ...errors, "from/unknown": "???" }
                    }
                }
            }
        )
        assert(() => space.models.first.assert("hmm")).throws.snap(
            `"At path from/unknown, ???"`
        )
        assert(
            space
                .create({ something: "second" })
                .validate({ something: { comesAfter: "no" } }).errors
        ).snap(`"{from/first: 'test', from/second: 'hi'}"`)
    })
    test("can access standard validation errors and ctx", () => {
        const num = create("number", {
            validate: {
                validator: (value, errors, { ctx }) => {
                    const errorMessages = Object.values(errors)
                    if (errorMessages.length) {
                        return {
                            [ctx.path.join("/")]: errorMessages
                                .map((error) => `${error}!!!`)
                                .join("")
                        }
                    }
                    return {}
                }
            }
        })
        assert(num.validate(7.43).errors).is(undefined)
        assert(num.validate("ssalbdivad").errors).snap(
            `"'ssalbdivad' is not assignable to number.!!!"`
        )
    })
})
