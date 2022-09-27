import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../api.js"

describe("parse constraint integration", () => {
    test("%,>=", () => {
        assert(type("number%10>=2").ast).narrowedValue([
            "number",
            ":",
            [
                ["%", 10],
                [">=", 2]
            ]
        ])
    })
    test("<,%,<=", () => {
        assert(type("2<number%10<=4").ast).narrowedValue([
            "number",
            ":",
            [
                ["%", 10],
                [">", 2],
                ["<=", 4]
            ]
        ])
    })
})
