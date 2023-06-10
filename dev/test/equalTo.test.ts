import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("===", () => {
    test("base", () => {
        const s = Symbol("test")
        const t = type(["===", s])
        attest(t.infer).typed as symbol
        // attest(t.node).equals({ symbol: { value: s } })
        attest(t(s).data).equals(s)
        attest(t("test").problems?.summary).snap(
            "Must be (symbol test) (was 'test')"
        )
    })
})
