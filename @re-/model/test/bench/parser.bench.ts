import { bench } from "@re-/assert"
import z from "zod"
import { Common } from "#common"
import { model, Root } from "#src"

const defaultParseContext = Common.Parser.createContext()

bench("validate undefined", () => {
    Root.parse("string?", defaultParseContext).validateByPath(undefined)
}).median(`63.00ns`)

bench("validate undefined model", () => {
    model("string?").validate(undefined)
}).median(`79.00ns`)

bench("zod undefined", () => {
    z.string().optional().parse(undefined)
}).median(`726.00ns`)

bench("validate string", () => {
    Root.parse("string?", defaultParseContext).validateByPath("test")
}).median(`127.00ns`)

bench("validate string model", () => {
    model("string?").validate("test")
}).median(`145.00ns`)

bench("zod string", () => {
    z.string().optional().parse("test")
}).median(`783.00ns`)

bench("parse deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    )
}).median(`56.00ns`)

const eagerParseContext = Common.Parser.createContext({ eager: true })

bench("parse deeep eager", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        eagerParseContext
    )
}).median(`995.00ns`)

bench("validate deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    ).validateByPath("test")
}).median(`1.25us`)

const deepPreparsed = Root.parse(
    "string???????????????????????????????????????????",
    defaultParseContext
)

bench("validate deeep preparsed", () => {
    deepPreparsed.validateByPath("test")
}).median(`294.00ns`)

bench("validate map", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: "okay", b: 5, c: { nested: true } })
}).median(`1.90us`)

bench("validate map model", () => {
    model({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
}).median(`1.90us`)

bench("zod map", () => {
    z.object({
        a: z.string().optional(),
        b: z.number().optional(),
        c: z.object({
            nested: z.boolean().optional()
        })
    }).parse({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
}).median(`6.90us`)

bench("validate map bad", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: 5, b: 5, c: { nested: true } })
}).median(`2.19us`)

bench("validate tuple", () => {
    Root.parse(
        ["string?", "number?", ["boolean?"]],
        defaultParseContext
    ).validateByPath(["okay", 5, [true]])
}).median(`1.51us`)

bench("validate regex", () => {
    Root.parse(/.*/, defaultParseContext).validateByPath("test")
}).median(`105.00ns`)

bench("validate literal", () => {
    Root.parse(7, defaultParseContext).validateByPath(7)
}).median(`89.00ns`)

bench("parse union", () => {
    Root.parse("string|number", eagerParseContext)
}).median(`622.00ns`)

const smallUnion = Root.parse("string|number", eagerParseContext)

bench("validate small union second", () => {
    smallUnion.validateByPath(5)
}).median(`388.00ns`)

bench("validate small union first", () => {
    smallUnion.validateByPath("")
}).median(`185.00ns`)

bench("parse large union eager", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", eagerParseContext)
}).median(`2.00us`)

bench("parse then validate large union", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", defaultParseContext).validateByPath(5)
}).median(`3.24us`)

bench("parse then validate large union first", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", defaultParseContext).validateByPath(1)
}).median(`2.45us`)

bench("parse then validate large union miss", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", defaultParseContext).validateByPath(10)
}).median(`3.92us`)

bench("errors at paths", () => {
    Root.parse(
        {
            a: "string|number",
            b: "boolean?",
            c: { nested: ["undefined|null", "bigint"] }
        },
        defaultParseContext
    ).validateByPath({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`5.83us`)

bench("list type", () => {
    Root.parse("string[]", defaultParseContext).validateByPath([
        "hi",
        "there",
        "we're",
        "strings",
        5
    ])
}).median(`1.70us`)
