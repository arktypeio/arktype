// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "../../src/main.js"

type("(boolean | number | 'foo')[]")

const creditCard = type(
    "/^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35d{3})d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$/"
)

type({
    a: "string|number"
})

type(["string|number", "[]"])

const types = scope({ notASpace: { a: type("string") } }).compile()
attest(types.notASpace).typed as Type<{ a: string }, Ark>

test("type definition", () => {
    const types = scope({ a: type("string") }).compile()
    attest(types.a.infer).typed as string
    attest(() =>
        // @ts-expect-error
        scope({ a: type("strong") })
    ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
})

const $ = scope({
    b: "3.14",
    a: () => $.type("number"), //.morph((data) => `${data}`),
    aAndB: () => $.type("a&b"),
    bAndA: () => $.type("b&a")
})

scope({
    // nested highlighting
    a: "string|number",
    b: [
        {
            nested: "a"
        }
    ]
})

{
    const type = (arg?: any) => {}
    type({
        foo: "string|number"
    })
    const obj = {
        type
    }
    obj.type({})
    // syntax should still be correctly highlighted
    const foo = {}

    const outer = (...args: any[]) => obj

    outer("ark", () => {
        const arkType = type({
            number: "number",
            negNumber: "number",
            maxNumber: "number",
            string: "string",
            longString: "string",
            boolean: "boolean",
            deeplyNested: {
                foo: "string",
                num: "number",
                bool: "boolean"
            }
        })
    }).type()
    const t = type(`${2}<Date<${4}`)

    const $ = scope({ a: "string" })
    const importer = $.scope({ b: "a" })

    const func = (f: any) => f
    const abc = func($.type("string"))
}
