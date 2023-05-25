/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "../../src/main.js"

type("(boolean | number | 'foo')[]")

type({
    a: "string|number"
})

type(["string|number", "[]"])

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
