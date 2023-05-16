/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "../../src/main.js"

type("string|number[]")

type({
    a: "string|number"
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
    const type = (arg?: any) => {
        arg
    }
    type({
        foo: "string|number"
    })
    const obj = {
        type
    }
    obj.type({})
    // syntax should still be correctly highlighted

    const outer = (...args: any[]) => obj
    const ob = {
        a: "string"
    }
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
}
