import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../api.js"

describe("branch", () => {
    test("intersection parsed before union", () => {
        attest(type("'0'|'1'&'2'|'3'").infer).typed as "0" | "3"
    })
})
