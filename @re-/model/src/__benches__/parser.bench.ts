import { bench } from "@re-/assert"
import { Base } from "../nodes/base.js"
import { Root } from "../nodes/root.js"
import { Str } from "../nodes/str/str.js"
const defaultParseContext = Base.defaultParseContext

bench(
    "validate undefined",
    () => {
        Root.parse("string?", defaultParseContext).validateByPath(undefined)
    },
    {
        hooks: {
            afterCall: Str.resetCache
        }
    }
).median("46.00ns")

bench("validate undefined (cached)", () => {
    Root.parse("string?", defaultParseContext).validateByPath(undefined)
}).median("37.00ns")

bench("validate string", () => {
    Root.parse("string?", defaultParseContext).validateByPath("test"),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("128.00ns")

bench("validate string (cached)", () => {
    Root.parse("string?", defaultParseContext).validateByPath("test")
}).median("52.00ns")

bench("validate deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    ).validateByPath("test"),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("950.00ns")

bench("validate deeep (cached)", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    ).validateByPath("test")
}).median("254.00ns")

bench("validate map", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: "okay", b: 5, c: { nested: true } }),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("1.28us")

bench("validate map (cached)", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: "okay", b: 5, c: { nested: true } })
}).median("821.00ns")

bench("validate map bad", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: 5, b: 5, c: { nested: true } }),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("1.43us")

bench("validate map bad (cached)", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: 5, b: 5, c: { nested: true } })
}).median("1.05us")

bench("validate tuple", () => {
    Root.parse(
        ["string?", "number?", ["boolean?"]],
        defaultParseContext
    ).validateByPath(["okay", 5, [true]]),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("762.00ns")

bench("validate tuple (cached)", () => {
    Root.parse(
        ["string?", "number?", ["boolean?"]],
        defaultParseContext
    ).validateByPath(["okay", 5, [true]])
}).median("405.00ns")

bench("validate regex", () => {
    Root.parse(/.*/, defaultParseContext).validateByPath("test"),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("99.00ns")

bench("validate regex (cached)", () => {
    Root.parse(/.*/, defaultParseContext).validateByPath("test")
}).median("63.00ns")

bench("validate literal", () => {
    Root.parse(7, defaultParseContext).validateByPath(7),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("84.00ns")

bench("validate literal (cached)", () => {
    Root.parse(7, defaultParseContext).validateByPath(7)
}).median("75.00ns")

bench("validate union", () => {
    Root.parse("string|number", defaultParseContext).validateByPath(5),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("571.00ns")

bench("validate union (cached)", () => {
    Root.parse("string|number", defaultParseContext).validateByPath(5)
}).median("272.00ns")

bench("errors at paths", () => {
    Root.parse(
        {
            a: "string|number",
            b: "boolean?",
            c: { nested: ["undefined|null", "bigint"] }
        },
        defaultParseContext
    ).validateByPath({ a: [], b: "hi", c: { nested: [true, 5] } }),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("4.27us")

bench("errors at paths (cached)", () => {
    Root.parse(
        {
            a: "string|number",
            b: "boolean?",
            c: { nested: ["undefined|null", "bigint"] }
        },
        defaultParseContext
    ).validateByPath({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median("2.66us")

bench("list type", () => {
    Root.parse("string[]", defaultParseContext).validateByPath([
        "hi",
        "there",
        "we're",
        "strings",
        5
    ]),
        {
            hooks: {
                afterCall: Str.resetCache
            }
        }
}).median("1.49us")

bench("list type (cached)", () => {
    Root.parse("string[]", defaultParseContext).validateByPath([
        "hi",
        "there",
        "we're",
        "strings",
        5
    ])
}).median("1.42us")
