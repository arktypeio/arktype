import { assert } from "@arktype/check"
import { describe, test } from "mocha"
import { toString } from "../index.js"
import { o } from "./common.js"

describe("toString", () => {
    test("default", () => {
        assert(toString(o)).snap(
            `{a: {a: "", b: [0], c: {a: true, b: false, c: null}}, b: {a: {a: 1}}, c: null, d: "initial", e: [{a: ["old"]}, {a: ["old"]}]}`
        )
    })
    test("quotes", () => {
        assert(toString({ a: "quoteless" }, { quote: "none" })).equals(
            `{a: quoteless}`
        )
        assert(toString({ a: "single" }, { quote: "single" })).equals(
            `{a: 'single'}`
        )
        assert(toString({ a: "double" }, { quote: "double" })).equals(
            `{a: "double"}`
        )
        assert(toString({ a: "backtick" }, { quote: "backtick" })).equals(
            "{a: `backtick`}"
        )
    })
    test("truncate", () => {
        assert(
            toString(
                { a: "include this but not that" },
                { maxNestedStringLength: 17 }
            )
        ).snap(`{a: "include this but..."}`)
        assert(
            toString({ a: "include this" }, { maxNestedStringLength: 17 })
        ).snap(`{a: "include this"}`)
    })
    test("indent", () => {
        assert(toString(o, { indent: 2 })).snap(`{
  a: {
    a: "",
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
  d: "initial",
  e: [
    {
      a: [
        "old"
      ]
    },
    {
      a: [
        "old"
      ]
    }
  ]
}`)
        assert(toString(o, { indent: 4 })).snap(`{
    a: {
        a: "",
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
    d: "initial",
    e: [
        {
            a: [
                "old"
            ]
        },
        {
            a: [
                "old"
            ]
        }
    ]
}`)
    })
    test("symbol keys", () => {
        const symbolKey = Symbol("example")
        assert(
            toString({
                [symbolKey]: true
            })
        ).snap(`{Symbol(example): true}`)
    })
    test("key quotes", () => {
        assert(toString({ a: "quoteKeys" }, { keyQuote: "single" })).equals(
            `{'a': "quoteKeys"}`
        )
    })
    test("non-alphanumeric key quotes", () => {
        assert(
            toString(
                {
                    "path/to/something": "something"
                },
                { nonAlphaNumKeyQuote: "double" }
            )
        ).snap(`{"path/to/something": "something"}`)
    })
})
