import { assert } from "@re-/assert"
import { compile, CustomValidator, model } from "../src/index.js"

describe("custom validators", () => {
    const validator: CustomValidator = ({ value }) => {
        if (
            typeof value !== "string" ||
            value !== [...value].reverse().join("")
        ) {
            return `${value} is not a palindrome!`
        }
    }
    it("inline", () => {
        const palindrome = compile({ palindrome: "string" }).create(
            "palindrome",
            {
                validate: { validator }
            }
        )
        assert(palindrome.validate("step on no pets").errorsByPath).equals(
            undefined
        )
        assert(palindrome.validate("step on your cat").errorsByPath).equals({
            "": `step on your cat is not a palindrome!`
        })
    })
    it("model root", () => {
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
    it("model nested", () => {
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
            `At path name, rob is not a palindrome!`
        )
    })
    it("space", () => {
        const space = compile(
            {
                first: 1,
                second: 2
            },
            {
                validate: {
                    validator: ({ def, value, getOriginalErrors }) => {
                        if (def === "first") {
                            return value === 1
                                ? undefined
                                : {
                                      "from/first": `${value} FAILED TO BE 1.`
                                  }
                        }
                        return getOriginalErrors()
                    }
                }
            }
        )
        assert(space.models.first.validate(1).error).is(undefined)
        assert(() => space.models.first.assert(2)).throws.snap(
            `Error: At path from/first, 2 FAILED TO BE 1.`
        )
        assert(space.create("second").validate(1).error).snap(
            `1 is not assignable to 2.`
        )
    })
    it("can access standard validation errors and ctx", () => {
        const num = model("number", {
            validate: {
                validator: ({ getOriginalErrors, path }) => {
                    const errorMessages = Object.values(getOriginalErrors())
                    if (errorMessages.length) {
                        return {
                            [path]: errorMessages
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
            `'ssalbdivad' is not assignable to number.!!!`
        )
    })
})
