import { assert } from "@re-/assert"
import { toString } from "../src/index.js"
import { o } from "./common.js"

it("default", () => {
    assert(toString(o)).snap(
        `{a: {a: '', b: [0], c: {a: true, b: false, c: null}}, b: {a: {a: 1}}, c: null, d: 'initial', e: [{a: ['old']}, {a: ['old']}]}`
    )
})
it("quotes", () => {
    assert(toString({ a: "quoteless" }, { quotes: "none" })).equals(
        `{a: quoteless}`
    )
    assert(toString({ a: "single" }, { quotes: "single" })).equals(
        `{a: 'single'}`
    )
    assert(toString({ a: "double" }, { quotes: "double" })).equals(
        `{a: "double"}`
    )
    assert(toString({ a: "backtick" }, { quotes: "backtick" })).equals(
        "{a: `backtick`}"
    )
    assert(toString({ a: "quoteKeys" }, { quoteKeys: true })).equals(
        "{'a': 'quoteKeys'}"
    )
})
it("truncate", () => {
    assert(
        toString(
            { a: "include this but not that" },
            { maxNestedStringLength: 17 }
        )
    ).snap(`{a: 'include this but...'}`)
    assert(toString({ a: "include this" }, { maxNestedStringLength: 17 })).snap(
        `{a: 'include this'}`
    )
})
it("indent", () => {
    assert(toString(o, { indent: 2 })).snap(`{
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
}`)
    assert(toString(o, { indent: 4 })).snap(`{
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
}`)
})
it("symbol keys", () => {
    const symbolKey = Symbol("example")
    assert(
        toString({
            [symbolKey]: true
        })
    ).snap(`{Symbol(example): true}`)
})
