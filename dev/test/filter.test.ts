import { describe, it } from "mocha"
import type { Type } from "../../src/main.js"
import { type } from "../../src/main.js"
import type { assertEqual } from "../../src/utils/generics.js"
import { attest } from "../attest/main.js"

describe("filter", () => {
    it("implicit problem", () => {
        const isOdd = (n: number) => n % 2 === 1
        const odd = type(["number", "=>", isOdd])
        attest(odd.infer).typed as number
        attest(odd.node).equals({ number: { narrow: isOdd as any } })
        attest(odd(1).data).equals(1)
        attest(odd(2).problems?.summary).snap(
            "Must be valid according to isOdd (was 2)"
        )
    })
    it("implicit problem anonymous", () => {
        const even = type(["number", "=>", (n) => n % 2 === 0])
        attest(even(1).problems?.summary).snap("Must be valid (was 1)")
    })
    it("explicit problem", () => {
        const even = type([
            "number",
            "=>",
            (n, problems) =>
                // TODO: fix input
                n % 3 === 0 || !problems.mustBe("divisible by 3", n, new Path())
        ])
        attest(even(1).problems?.summary).snap("Must be divisible by 3 (was 1)")
    })
    it("problem at path", () => {
        const abEqual = type([
            {
                a: "number",
                b: "number"
            },
            "=>",
            ({ a, b }, problems) => {
                if (a === b) {
                    return true
                }
                problems.mustBe("equal to b", { path: ["a"] })
                problems.mustBe("equal to a", { path: ["b"] })
                return false
            }
        ])
        attest(abEqual({ a: 1, b: 1 }).data).equals({ a: 1, b: 1 })
        attest(abEqual({ a: 1, b: 2 }).problems?.summary).snap(
            'a must be equal to b (was {"a":1,"b":2})\nb must be equal to a (was {"a":1,"b":2})'
        )
    })
    it("functional predicate", () => {
        const one = type(["number", "=>", (n): n is 1 => n === 1])
        attest(one).typed as Type<1>
    })
    it("functional parameter inference", () => {
        type Expected = number | boolean[]
        const validateNumberOrBooleanList = <t>(t: assertEqual<t, Expected>) =>
            true
        attest(
            type([
                "number|boolean[]",
                "=>",
                (data) => validateNumberOrBooleanList(data)
            ]).infer
        ).typed as number | boolean[]
        attest(() => {
            type([
                "number|boolean[]",
                "=>",
                // @ts-expect-error
                (data: number | string[]) => !!data
            ])
        }).type.errors("Type 'boolean' is not assignable to type 'string'.")
    })
    it("narrow problem", () => {
        const palindrome = type([
            "string",
            "=>",
            (s, problems) =>
                s === [...s].reverse().join("")
                    ? true
                    : // TODO: fix input
                      !problems.mustBe("a palindrome", s, new Path())
        ])
        attest(palindrome).typed as Type<string>
        attest(palindrome("dad").data).snap("dad")
        attest(palindrome("david").problems?.summary).snap(
            "Must be a palindrome (was 'david')"
        )
    })
})
