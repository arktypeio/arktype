import { assert } from "@re-/assert"
import { compile, model } from "@re-/model"

describe("custom validators", () => {
    const validator = (value: unknown) => {
        if (
            typeof value === "string" &&
            value === [...value].reverse().join("")
        ) {
            return ""
        }
        return `${value} is not a palindrome!`
    }
    test("inline", () => {
        const palindrome = model("string", {
            validate: { validator }
        })
        assert(palindrome.validate("step on no pets").errorsByPath).is(
            undefined
        )
        assert(palindrome.validate("step on your cat").errorsByPath).equals({
            "": `step on your cat is not a palindrome!`
        })
    })
    test("model root", () => {
        const space = compile(
            { palindrome: "string" },
            { models: { palindrome: { validate: { validator } } } }
        )
        assert(space.models.palindrome.validate("redivider").error).is(
            undefined
        )
        assert(space.models.palindrome.validate("predivider").error).is(
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
        assert(space.models.yourPal.validate({ name: "bob" }).error).is(
            undefined
        )
        assert(space.models.yourPal.validate({ name: "rob" }).error).snap(
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
                .validate({ something: { comesAfter: "no" } }).error
        ).snap(`
"Encountered errors at the following paths:
{
  from/first: 'test',
  from/second: 'hi'
}"
`)
    })
    test("can access standard validation errors and ctx", () => {
        const num = model("number", {
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
        assert(num.validate(7.43).error).is(undefined)
        assert(num.validate("ssalbdivad").error).snap(
            `"'ssalbdivad' is not assignable to number.!!!"`
        )
    })
})
