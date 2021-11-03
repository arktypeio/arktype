import { stringify } from ".."
import { o } from "./common.js"

describe("stringify", () => {
    test("default", () => {
        expect(stringify(o)).toMatchInlineSnapshot(
            `"{a: {a: '', b: [0], c: {a: true, b: false, c: null}}, b: {a: {a: 1}}, c: null, d: 'initial', e: [{a: ['old']}, {a: ['old']}]}"`
        )
    })
    test("quotes", () => {
        expect(stringify({ a: "quoteless" }, { quotes: "none" })).toBe(
            `{a: quoteless}`
        )
        expect(stringify({ a: "single" }, { quotes: "single" })).toBe(
            `{a: 'single'}`
        )
        expect(stringify({ a: "double" }, { quotes: "double" })).toBe(
            `{a: "double"}`
        )
        expect(stringify({ a: "backtick" }, { quotes: "backtick" })).toBe(
            "{a: `backtick`}"
        )
        expect(stringify({ a: "quoteKeys" }, { quoteKeys: true })).toBe(
            "{'a': 'quoteKeys'}"
        )
    })
    test("indent", () => {
        expect(stringify(o, { indent: 2 })).toMatchInlineSnapshot(`
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
    expect(stringify(o, { indent: 4 })).toMatchInlineSnapshot(`
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
