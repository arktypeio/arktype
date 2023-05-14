import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import type { Ark } from "../../src/scopes/ark.js"
import type { Type } from "../../src/type.js"
import type { equals } from "../../src/utils/generics.js"
import { Path } from "../../src/utils/lists.js"
import { attest } from "../attest/main.js"

suite("filter", () => {
    test("implicit problem", () => {
        const isOdd = (n: number) => n % 2 === 1
        const odd = type(["number", "=>", isOdd])
        attest(odd.infer).typed as number
        // attest(odd.node).equals({ number: { narrow: isOdd as any } })
        attest(odd(1).data).equals(1)
        attest(odd(2).problems?.summary).snap(
            "Must be valid according to isOdd (was 2)"
        )
    })
    test("implicit problem anonymous", () => {
        const even = type(["number", "=>", (n) => n % 2 === 0])
        attest(even(1).problems?.summary).snap("Must be valid (was 1)")
    })
    test("explicit problem", () => {
        const even = type([
            "number",
            "=>",
            (n, problems) =>
                n % 3 === 0 || !problems.mustBe("divisible by 3", n, new Path())
        ])
        attest(even(1).problems?.summary).snap("Must be divisible by 3 (was 1)")
    })
    test("problem at path", () => {
        type([{ s: "string" }])
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
                problems.mustBe("equal to b", a, new Path("a"))
                problems.mustBe("equal to a", b, new Path("b"))
                return false
            }
        ])
        attest(abEqual({ a: 1, b: 1 }).data).equals({ a: 1, b: 1 })
        attest(abEqual({ a: 1, b: 2 }).problems?.summary).snap(
            'a must be equal to b (was {"a":1,"b":2})\nb must be equal to a (was {"a":1,"b":2})'
        )
    })
    test("functional predicate", () => {
        const one = type(["number", "=>", (n): n is 1 => n === 1])
        attest(one).typed as Type<1>
    })
    test("functional parameter inference", () => {
        type Expected = number | boolean[]
        const validateNumberOrBooleanList = <t>(
            t: equals<t, Expected> extends true ? t : Expected
        ) => true
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
        }).types.errors("Type 'boolean' is not assignable to type 'string'.")
    })
    test("narrow problem", () => {
        const palindrome = type([
            "string",
            "=>",
            (s, problems) =>
                s === [...s].reverse().join("")
                    ? true
                    : !problems.mustBe("a palindrome", s, new Path())
        ])
        attest(palindrome).typed as Type<string>
        attest(palindrome("dad").data).snap("dad")
        attest(palindrome("david").problems?.summary).snap(
            "Must be a palindrome (was 'david')"
        )
    })
    test("narrows the output type of a morph", () => {
        // TODO: should preserve morph
        const t = type("string")
            .morph((s) => s.length)
            .narrow((n): n is 5 => n === 5)
        attest(t).typed as Type<(In: string) => 5, Ark>
        attest(t.root.condition).snap()
    })
})
