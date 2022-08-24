import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../index.js"

describe("map", () => {
    describe("empty", () => {
        const empty = type({})
        test("type", () => {
            assert(empty.infer).typed as {}
        })
        test("validation", () => {
            assert(empty.validate({}).error).is(undefined)
            assert(empty.validate([]).error?.message).snap(
                `[] is not assignable to {}.`
            )
        })
        test("generation", () => {
            assert(empty.create()).equals({})
        })
    })
    describe("shallow", () => {
        const shallow = () =>
            type({
                a: "string",
                b: "number",
                c: "67"
            })
        test("type", () => {
            assert(shallow().infer).typed as {
                a: string
                b: number
                c: 67
            }
        })
        describe("validation", () => {
            test("standard", () => {
                assert(
                    shallow().validate({ a: "ok", b: 4.321, c: 67 }).error
                ).is(undefined)
            })
            test("ignore extraneous keys", () => {
                assert(
                    shallow().validate(
                        {
                            a: "ok",
                            b: 4.321,
                            c: 67,
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        },
                        { ignoreExtraneousKeys: true }
                    ).error
                ).is(undefined)
                // Still errors on missing keys
                assert(
                    shallow().validate(
                        {
                            a: "ok",
                            c: 67,
                            d: "extraneous"
                        },

                        { ignoreExtraneousKeys: true }
                    ).error?.message
                ).snap(`At path b, required value of type number was missing.`)
            })
            describe("errors", () => {
                test("bad value", () => {
                    assert(
                        shallow().validate({ a: "ko", b: 123.4, c: 76 }).error
                            ?.message
                    ).snap(`At path c, 76 is not assignable to 67.`)
                })
                test("missing keys", () => {
                    assert(shallow().validate({ a: "ok" }).error?.message)
                        .snap(`Encountered errors at the following paths:
  b: Required value of type number was missing.
  c: Required value of type 67 was missing.
`)
                })
                test("extraneous keys", () => {
                    assert(
                        shallow().validate({
                            a: "ok",
                            b: 4.321,
                            c: 67,
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).error?.message
                    ).snap(`Keys 'd', 'e' were unexpected.`)
                })
                test("missing and extraneous keys", () => {
                    assert(
                        shallow().validate({
                            a: "ok",
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).error?.message
                    ).snap(`Encountered errors at the following paths:
  b: Required value of type number was missing.
  c: Required value of type 67 was missing.
  : Keys 'd', 'e' were unexpected.
`)
                })
            })
        })
        test("generation", () => {
            assert(shallow().create()).equals({ a: "", b: 0, c: 67 })
        })
    })
    describe("nested", () => {
        const nested = () =>
            type({
                nested: {
                    russian: "'doll'"
                }
            })
        describe("type", () => {
            test("standard", () => {
                assert(nested().infer).typed as {
                    nested: {
                        russian: "doll"
                    }
                }
            })
            test("removes readonly modifier", () => {
                const readonlyDef = {
                    a: "true",
                    b: "false",
                    c: { nested: "boolean" }
                } as const
                assert(type(readonlyDef).infer).typed as {
                    a: true
                    b: false
                    c: {
                        nested: boolean
                    }
                }
            })
            describe("errors", () => {
                test("invalid prop def", () => {
                    // @ts-expect-error
                    assert(() => type({ a: { b: "whoops" } }))
                        .throws(
                            "Unable to determine the type of 'whoops' at path a/b."
                        )
                        .type.errors("Unable to determine the type of 'whoops'")
                })
            })
        })
        describe("validation", () => {
            test("standard", () => {
                assert(
                    nested().validate({ nested: { russian: "doll" } }).error
                ).is(undefined)
            })
            describe("errors", () => {
                test("bad prop value", () => {
                    assert(
                        nested().validate({ nested: { russian: "tortoise" } })
                            .error?.message
                    ).snap(
                        `At path nested/russian, "tortoise" is not assignable to 'doll'.`
                    )
                })
                test("multiple", () => {
                    assert(
                        type({
                            a: { b: "string" },
                            c: { d: "number" },
                            e: { f: "object" }
                        }).validate({
                            a: {},
                            c: { d: 20, y: "why?" },
                            e: { f: 0n }
                        }).error?.message
                    ).snap(`Encountered errors at the following paths:
  a/b: Required value of type string was missing.
  c: Keys 'y' were unexpected.
  e/f: 0n is not assignable to object.
`)
                })
            })
        })
        test("generation", () => {
            assert(nested().create()).equals({ nested: { russian: "doll" } })
        })
    })
})
