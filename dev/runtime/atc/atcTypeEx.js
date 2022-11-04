"use strict"
exports.__esModule = true
exports.user = void 0
exports.user = {
    type: "dictionary",
    props: {
        name: { type: "string" },
        browser: {
            type: "dictionary",
            props: {
                kind: {
                    branches: [
                        "|",
                        {
                            branches: [
                                "|",
                                { value: "chrome" },
                                { value: "firefox" }
                            ]
                        },
                        { value: "safari" }
                    ]
                },
                version: { type: "number", optional: true }
            }
        }
    },
    f: '(a, b)=>console.log("hi")'
}
