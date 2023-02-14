import { describe, it } from "mocha"
import type { Type } from "../api.ts"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("config", () => {
    it("tuple expression", () => {
        const t = type(["string", ":", {}])
        attest(t).typed as Type<string>
    })
})
