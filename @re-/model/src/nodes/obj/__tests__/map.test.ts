import { assert } from "@re-/assert"
import { model } from "#api"

describe("map", () => {
    describe("empty", () => {
        const empty = model({})
        it("type", () => {
            assert(empty.type).typed as {}
        })
        it("validation", () => {
            assert(empty.validate({}).error).is(undefined)
            assert(empty.validate([]).error).snap(`[] is not assignable to {}.`)
        })
        it("generation", () => {
            assert(empty.generate()).equals({})
        })
    })
    describe("shallow", () => {
        const shallow = model({
            a: "string",
            b: "number",
            c: 67
        })

        it("type", () => {
            assert(shallow.type).typed as {
                a: string
                b: number
                c: 67
            }
        })
        describe("validation", () => {
            it("standard", () => {
                assert(shallow.validate({ a: "ok", b: 4.321, c: 67 }).error).is(
                    undefined
                )
            })
            it("ignore extraneous keys", () => {
                assert(
                    shallow.validate(
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
                    shallow.validate(
                        {
                            a: "ok",
                            c: 67,
                            d: "extraneous"
                        },

                        { ignoreExtraneousKeys: true }
                    ).error
                ).snap(`Required keys 'b' were missing.`)
            })
            describe("errors", () => {
                it("bad value", () => {
                    assert(
                        shallow.validate({ a: "ko", b: 123.4, c: 76 }).error
                    ).snap(`At path c, 76 is not assignable to 67.`)
                })
                it("missing keys", () => {
                    assert(shallow.validate({ a: "ok" }).error).snap(
                        `Required keys 'b, c' were missing.`
                    )
                })
                it("extraneous keys", () => {
                    assert(
                        shallow.validate({
                            a: "ok",
                            b: 4.321,
                            c: 67,
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).error
                    ).snap(`Keys 'd, e' were unexpected.`)
                })
                it("missing and extraneous keys", () => {
                    assert(
                        shallow.validate({
                            a: "ok",
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).error
                    ).snap(
                        `Required keys 'b, c' were missing. Keys 'd, e' were unexpected.`
                    )
                })
            })
        })
        it("generation", () => {
            assert(shallow.generate()).equals({ a: "", b: 0, c: 67 })
        })
    })
    describe("nested", () => {
        const nested = model({
            nested: {
                russian: "'doll'"
            }
        })
        describe("type", () => {
            it("standard", () => {
                assert(nested.type).typed as {
                    nested: {
                        russian: "doll"
                    }
                }
            })
            describe("errors", () => {
                it("invalid prop def", () => {
                    // @ts-expect-error
                    assert(() => model({ a: { b: "whoops" } }))
                        .throws(
                            "Unable to determine the type of 'whoops' at path a/b."
                        )
                        .type.errors("Unable to determine the type of 'whoops'")
                })
                it("removes readonly modifier", () => {
                    const readonlyDef = {
                        a: "true",
                        b: "false",
                        c: { nested: "boolean" }
                    } as const
                    assert(model(readonlyDef).type).typed as {
                        a: true
                        b: false
                        c: {
                            nested: boolean
                        }
                    }
                })
            })
        })
        describe("validation", () => {
            it("standard", () => {
                assert(
                    nested.validate({ nested: { russian: "doll" } }).error
                ).is(undefined)
            })
            describe("errors", () => {
                it("bad prop value", () => {
                    assert(
                        nested.validate({ nested: { russian: "tortoise" } })
                            .error
                    ).snap(
                        `At path nested/russian, 'tortoise' is not assignable to 'doll'.`
                    )
                })
                it("multiple", () => {
                    assert(
                        model({
                            a: { b: "string" },
                            c: { d: "number" },
                            e: { f: "object" }
                        }).validate({
                            a: {},
                            c: { d: 20, y: "why?" },
                            e: { f: 0n }
                        }).error
                    ).snap(`Encountered errors at the following paths:
{
  a: 'Required keys 'b' were missing.',
  c: 'Keys 'y' were unexpected.',
  e/f: '0n is not assignable to object.'
}`)
                })
            })
        })
        it("generation", () => {
            assert(nested.generate()).equals({ nested: { russian: "doll" } })
        })
    })
})
