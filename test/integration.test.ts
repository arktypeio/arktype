import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("branch", () => {
    test("intersection parsed before union", () => {
        attest(type("'0'|'1'&'2'|'3'").infer).typed as "0" | "3"
    })
})
