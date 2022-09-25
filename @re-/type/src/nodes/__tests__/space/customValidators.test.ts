import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { define, space, type } from "../../../index.js"
import type { CustomValidator } from "../../../index.js"

describe("custom validators", () => {
    const palindromeValidator: CustomValidator = ({ data }) => {
        if (typeof data !== "string" || data !== [...data].reverse().join("")) {
            return `${data} is not a palindrome!`
        }
    }
    test("type", () => {
        const palindrome = type("string", {
            narrow: ({ data }) =>
                data === [...data].reverse().join("")
                    ? undefined
                    : `'${data}' is not a palindrome!`
        })
        console.log(palindrome.check("step on no pets").errors?.summary)
        console.log(palindrome.check("step on your cat").errors?.summary)
    })
    test("inline", () => {
        const palindrome = space({ palindrome: "string" }).$root.type(
            "palindrome",
            {
                narrow: palindromeValidator
            }
        )
        assert(palindrome.check("step on no pets").errors).equals(undefined)
        assert(palindrome.check("step on your cat").errors?.summary).equals(
            `step on your cat is not a palindrome!`
        )
    })
    test("model root", () => {
        const mySpace = space({
            palindrome: define("string", {
                narrow: palindromeValidator
            })
        })
        assert(mySpace.palindrome.check("redivider").errors).is(undefined)
        assert(mySpace.palindrome.check("predivider").errors?.summary).is(
            `predivider is not a palindrome!`
        )
    })
    test("model nested", () => {
        const mySpace = space({
            palindrome: define("string", {
                narrow: palindromeValidator
            }),
            yourPal: { name: "palindrome" }
        })
        assert(mySpace.yourPal.check({ name: "bob" }).errors).is(undefined)
        assert(mySpace.yourPal.check({ name: "rob" }).errors?.summary).snap(
            `name rob is not a palindrome!`
        )
    })
})
