import { describe, it } from "mocha"
import { type, valueOf } from "../../src/main.js"
import { attest } from "#attest"

describe("===", () => {
    it("base", () => {
        const s = Symbol("test")
        const t = type(["===", s])
        attest(t.infer).typed as symbol
        attest(t.node).equals({ symbol: { value: s } })
        attest(t(s).data).equals(s)
        attest(t("test").problems?.summary).snap(
            "Must be (symbol test) (was 'test')"
        )
    })
    it("helper", () => {
        const myRef = { a: "bc" as const }
        const myObj = valueOf(myRef)
        attest(myObj.infer).typed as { a: "bc" }
        attest(myObj(myRef).data).equals(myRef)
        attest(myObj({ a: "bc" }).problems?.summary).snap(
            // Message should be improved for cases like this:
            // https://github.com/arktypeio/arktype/issues/622
            'Must be {"a":"bc"} (was {"a":"bc"})'
        )
    })
})
