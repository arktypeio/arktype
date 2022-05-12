import { toString } from ".."
import { o } from "./common"

describe("toString", () => {
    test("default", () => {
        expect(toString(o)).toMatchInlineSnapshot(
            `"{a: {a: '', b: [0], c: {a: true, b: false, c: null}}, b: {a: {a: 1}}, c: null, d: 'initial', e: [{a: ['old']}, {a: ['old']}]}"`
        )
    })
    test("quotes", () => {
        expect(toString({ a: "quoteless" }, { quotes: "none" })).toBe(
            `{a: quoteless}`
        )
        expect(toString({ a: "single" }, { quotes: "single" })).toBe(
            `{a: 'single'}`
        )
        expect(toString({ a: "double" }, { quotes: "double" })).toBe(
            `{a: "double"}`
        )
        expect(toString({ a: "backtick" }, { quotes: "backtick" })).toBe(
            "{a: `backtick`}"
        )
        expect(toString({ a: "quoteKeys" }, { quoteKeys: true })).toBe(
            "{'a': 'quoteKeys'}"
        )
    })
    test("truncate", () => {
        expect(
            toString(
                { a: "include this but not that" },
                { maxNestedStringLength: 17 }
            )
        ).toMatchInlineSnapshot(`"{a: 'include this but...'}"`)
        expect(
            toString({ a: "include this" }, { maxNestedStringLength: 17 })
        ).toMatchInlineSnapshot(`"{a: 'include this'}"`)
    })
    test("indent", () => {
        expect(toString(o, { indent: 2 })).toMatchInlineSnapshot(`
            "{
              a: {
                a: '',
                b: [
                  0
                ],
                c: {
                  a: true,
                  b: false,
                  c: null
                }
              },
              b: {
                a: {
                  a: 1
                }
              },
              c: null,
              d: 'initial',
              e: [
                {
                  a: [
                    'old'
                  ]
                },
                {
                  a: [
                    'old'
                  ]
                }
              ]
            }"
        `)
        expect(toString(o, { indent: 4 })).toMatchInlineSnapshot(`
        "{
            a: {
                a: '',
                b: [
                    0
                ],
                c: {
                    a: true,
                    b: false,
                    c: null
                }
            },
            b: {
                a: {
                    a: 1
                }
            },
            c: null,
            d: 'initial',
            e: [
                {
                    a: [
                        'old'
                    ]
                },
                {
                    a: [
                        'old'
                    ]
                }
            ]
        }"
    `)
    })
    test("symbol keys", () => {
        const symbolKey = Symbol("example")
        expect(
            toString({
                [symbolKey]: true
            })
        ).toMatchInlineSnapshot(`"{Symbol(example): true}"`)
    })
})
