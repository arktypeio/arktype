import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { CustomValidator, def, space, type } from "../../index.js"

describe("custom validators", () => {
    const validator: CustomValidator = ({ data: value }) => {
        if (
            typeof value !== "string" ||
            value !== [...value].reverse().join("")
        ) {
            return `${value} is not a palindrome!`
        }
    }
    test("inline", () => {
        const palindrome = space({ palindrome: "string" }).$root.type(
            "palindrome",
            {
                validate: { validator }
            }
        )
        assert(palindrome.check("step on no pets").errors).equals(undefined)
        assert(palindrome.check("step on your cat").errors?.summary).equals(
            `step on your cat is not a palindrome!`
        )
    })
    test("model root", () => {
        const mySpace = space({
            palindrome: def("string", { validate: { validator } })
        })
        assert(mySpace.palindrome.check("redivider").errors).is(undefined)
        assert(mySpace.palindrome.check("predivider").errors?.summary).is(
            `predivider is not a palindrome!`
        )
    })
    test("model nested", () => {
        const mySpace = space({
            palindrome: def("string", { validate: { validator } }),
            yourPal: { name: "palindrome" }
        })
        assert(mySpace.yourPal.check({ name: "bob" }).errors).is(undefined)
        assert(mySpace.yourPal.check({ name: "rob" }).errors?.summary).snap(
            `At path name, rob is not a palindrome!`
        )
    })
    test("space", () => {
        const mySpace = space(
            {
                first: "1",
                second: "2"
            },
            {
                validate: {
                    validator: ({
                        path,
                        definition: type,
                        data: value,
                        getOriginalErrors
                    }) => {
                        if (type === "first") {
                            return value === 1
                                ? undefined
                                : `At path ${path.join(
                                      "/"
                                  )}, ${value} FAILED TO BE 1.`
                        }
                        return getOriginalErrors().map((_) => _.message)
                    }
                }
            }
        )
        assert(mySpace.first.check(1).errors).is(undefined)
        assert(() => mySpace.first.assert(2)).throws.snap(
            `Error: At path first, 2 FAILED TO BE 1.`
        )
        assert(mySpace.$root.type("second").check(1).errors?.summary).snap(
            `1 is not assignable to 2.`
        )
    })
    test("can access standard validation errors and ctx", () => {
        const num = type("number", {
            validate: {
                validator: ({ getOriginalErrors }) => {
                    const errorMessages = Object.values(getOriginalErrors())
                    if (errorMessages.length) {
                        return errorMessages.map(
                            (error) => `${error.message}!!!`
                        )
                    }
                }
            }
        })
        assert(num.check(7.43).errors).is(undefined)
        assert(num.check("ssalbdivad").errors?.summary).snap(
            `"ssalbdivad" is not assignable to number.!!!`
        )
    })
})
