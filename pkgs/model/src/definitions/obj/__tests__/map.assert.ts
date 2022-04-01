import { assert } from "@re-/assert"
import { create } from "@re-/model"
import { lazily } from "@re-/tools"

export const testMap = () => {
    describe("empty", () => {
        const empty = lazily(() => create({}))
        test("type", () => {
            assert(empty.type).typed as {}
        })
        test("validation", () => {
            assert(empty.validate({}).error).is(undefined)
            assert(empty.validate([]).error).snap(
                `"[] is not assignable to {}."`
            )
        })
        test("generation", () => {
            assert(empty.generate()).equals({})
        })
    })
    describe("shallow", () => {
        const shallow = lazily(() =>
            create({
                a: "string",
                b: "number",
                c: 67
            })
        )
        test("type", () => {
            assert(shallow.type).typed as {
                a: string
                b: number
                c: 67
            }
        })
        describe("validation", () => {
            test("standard", () => {
                assert(shallow.validate({ a: "ok", b: 4.321, c: 67 }).error).is(
                    undefined
                )
            })
            test("ignore extraneous keys", () => {
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
                ).snap(`"Required keys 'b' were missing."`)
            })
            describe("errors", () => {
                test("bad value", () => {
                    assert(
                        shallow.validate({ a: "ko", b: 123.4, c: 76 }).error
                    ).snap(`"At path c, 76 is not assignable to 67."`)
                })
                test("missing keys", () => {
                    assert(shallow.validate({ a: "ok" }).error).snap(
                        `"Required keys 'b, c' were missing."`
                    )
                })
                test("extraneous keys", () => {
                    assert(
                        shallow.validate({
                            a: "ok",
                            b: 4.321,
                            c: 67,
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).error
                    ).snap(`"Keys 'd, e' were unexpected."`)
                })
                test("missing and extraneous keys", () => {
                    assert(
                        shallow.validate({
                            a: "ok",
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).error
                    ).snap(
                        `"Required keys 'b, c' were missing. Keys 'd, e' were unexpected."`
                    )
                })
            })
        })
        test("generation", () => {
            assert(shallow.generate()).equals({ a: "", b: 0, c: 67 })
        })
    })
    describe("nested", () => {
        const nested = lazily(() =>
            create({
                nested: {
                    russian: "'doll'"
                }
            })
        )
        describe("type", () => {
            test("standard", () => {
                assert(nested.type).typed as {
                    nested: {
                        russian: "doll"
                    }
                }
            })
            describe("errors", () => {
                test("invalid prop def", () => {
                    // @ts-expect-error
                    assert(() => create({ a: { b: "whoops" } }))
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
                    nested.validate({ nested: { russian: "doll" } }).error
                ).is(undefined)
            })
            describe("errors", () => {
                test("bad prop value", () => {
                    assert(
                        nested.validate({ nested: { russian: "tortoise" } })
                            .error
                    ).snap(
                        `"At path nested/russian, 'tortoise' is not assignable to 'doll'."`
                    )
                })
                test("multiple", () => {
                    assert(
                        create({
                            a: { b: "string" },
                            c: { d: "number" },
                            e: { f: "object" }
                        }).validate({
                            a: {},
                            c: { d: 20, y: "why?" },
                            e: { f: 0n }
                        }).error
                    ).snap(`
"Encountered errors at the following paths:
{
  a: 'Required keys 'b' were missing.',
  c: 'Keys 'y' were unexpected.',
  e/f: '0n is not assignable to object.'
}"
`)
                })
            })
        })
        test("generation", () => {
            assert(nested.generate()).equals({ nested: { russian: "doll" } })
        })
    })
}
