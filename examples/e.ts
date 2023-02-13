// @ts-nocheck
import { type } from "../api.ts"

type({
    a: [/.*/, "!a valid email"]
})

type({
    a: [/.*/, "=>", (s) => {}]
})

type({
    a: [
        /.*/,
        ":",
        {
            mustBe: "a valid email"
        }
    ]
})
