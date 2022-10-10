import { bench, suite } from "@re-/assert"
import { type } from "../../../api.js"

suite("unary", () => {
    suite("optional", () => {
        const optional = type("number?")
        suite("check", () => {
            suite("valid", () => {
                bench("value", () => {
                    optional.check(64)
                }).median()

                bench("undefined", () => {
                    optional.check(undefined)
                }).median()
            })

            bench("invalid", () => {
                optional.check(false)
            }).median()
        })
    })

    suite("array", () => {
        const array = type("number[]")
        const identity = (i: unknown) => i
        const listOfLength = (
            length: number,
            indexToValue: (i: number) => unknown = identity
        ) => [...Array(length)].map(indexToValue)

        suite("check", () => {
            suite("valid", () => {
                bench("empty", () => {
                    array.check([])
                }).median()

                const singleton = [1]
                bench("singleton", () => {
                    array.check(singleton)
                }).median()

                const tenNumbers = listOfLength(10)
                bench("10-element", () => {
                    array.check(tenNumbers)
                }).median()

                const hundredNumbers = listOfLength(100)
                bench("10-element", () => {
                    array.check(hundredNumbers)
                }).median()
            })
            suite("invalid", () => {
                bench("non-list", () => {
                    array.check(false)
                })

                const singleton = [false]
                bench("singleton", () => {
                    array.check(singleton)
                }).median()

                const tenElementAllInvalid = listOfLength(10, () => false)
                bench("10-element all invalid", () => {
                    array.check(tenElementAllInvalid)
                }).median()

                const tenElementLastInvalid = [...listOfLength(9), false]
                bench("10-element last invalid", () => {
                    array.check(tenElementLastInvalid)
                }).median()

                const hundredElementAllInvalid = listOfLength(100, () => false)
                bench("100-element all invalid", () => {
                    array.check(hundredElementAllInvalid)
                }).median()

                const hundredElementLastInvalid = [...listOfLength(99), false]
                bench("100-element last invalid", () => {
                    array.check(hundredElementLastInvalid)
                }).median()
            })
        })
    })
})
