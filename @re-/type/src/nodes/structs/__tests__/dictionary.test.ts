import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"
import { unresolvableMessage } from "../../../parser/str/operand/unenclosed.js"
import type {
    ExtraneousKeysDiagnostic,
    MissingKeyDiagnostic
} from "../dictionary.js"

describe("dictionary", () => {
    describe("empty", () => {
        const empty = type({})
        test("type", () => {
            assert(empty.infer).typed as {}
        })
        test("validation", () => {
            assert(empty.check({}).errors).is(undefined)
            assert(empty.check([]).errors?.summary).snap(
                `Must not be an array.`
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
                assert(shallow().check({ a: "ok", b: 4.321, c: 67 }).errors).is(
                    undefined
                )
            })
            describe("errors", () => {
                test("bad value", () => {
                    assert(
                        shallow().check({ a: "ko", b: 123.4, c: 76 }).errors
                            ?.summary
                    ).snap(`c must be 67 (was 76).`)
                })
                test("missing keys", () => {
                    assert(
                        shallow().check({ a: "ok" })
                            .errors as any as MissingKeyDiagnostic[]
                    ).snap([
                        {
                            code: `MissingKey`,
                            path: [`b`],
                            data: `<undefined>`,
                            options: `<undefined>`,
                            key: `b`,
                            message: `b is required.`
                        },
                        {
                            code: `MissingKey`,
                            path: [`c`],
                            data: `<undefined>`,
                            options: `<undefined>`,
                            key: `c`,
                            message: `c is required.`
                        }
                    ])
                })
                test("extraneous keys", () => {
                    assert(
                        shallow().check(
                            {
                                a: "ok",
                                b: 4.321,
                                c: 67,
                                d: "extraneous",
                                e: "x-ray-knee-us"
                            },
                            {
                                diagnostics: {
                                    ExtraneousKeys: { enable: true }
                                }
                            }
                        ).errors as any as ExtraneousKeysDiagnostic[]
                    ).snap([
                        {
                            code: `ExtraneousKeys`,
                            path: [],
                            data: {
                                a: `ok`,
                                b: 4.321,
                                c: 67,
                                d: `extraneous`,
                                e: `x-ray-knee-us`
                            },
                            options: { enable: true },
                            keys: [`d`, `e`],
                            message: `Keys d, e were unexpected.`
                        }
                    ])
                })
                test("missing and extraneous keys", () => {
                    assert(
                        shallow().check(
                            {
                                a: "ok",
                                d: "extraneous",
                                e: "x-ray-knee-us"
                            },
                            {
                                diagnostics: {
                                    ExtraneousKeys: { enable: true }
                                }
                            }
                        ).errors?.summary
                    ).snap(`Encountered errors at the following paths:
  b: b is required.
  c: c is required.
  /: Keys d, e were unexpected.
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
            describe("errors", () => {
                test("invalid prop def", () => {
                    assert(() =>
                        // @ts-expect-error
                        type({ a: { b: "whoops" } })
                    ).throwsAndHasTypeError(unresolvableMessage("whoops"))
                })
            })
        })
        describe("validation", () => {
            test("standard", () => {
                assert(
                    nested().check({ nested: { russian: "doll" } }).errors
                ).is(undefined)
            })
            describe("errors", () => {
                test("bad prop value", () => {
                    assert(
                        nested().check({ nested: { russian: "tortoise" } })
                            .errors?.summary
                    ).snap(`nested/russian must be "doll" (was "tortoise").`)
                })
                test("multiple", () => {
                    assert(
                        type({
                            a: { b: "string" },
                            c: { d: "number" },
                            e: { f: "object" }
                        }).check({
                            a: {},
                            c: { d: 20, y: "why?" },
                            e: { f: 0n }
                        }).errors?.summary
                    ).snap(`Encountered errors at the following paths:
  a/b: b is required.
  e/f: Must be an object (was bigint).
`)
                })
            })
        })
        test("generation", () => {
            assert(nested().create()).equals({ nested: { russian: "doll" } })
        })
    })
})
