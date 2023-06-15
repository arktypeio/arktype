import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("problems", () => {
    test("mustBe", () => {
        const tn = type("string").narrow((data, state) => {
            state.mustBe("a number", data, [])
            return true
        })
        const tm = type("string").morph((data, state) => {
            state.mustBe("a number", data, [])
        })
        attest(tn("foo")).snap()
        attest(tm("foo")).snap()
        attest(tn.array()(["foo", "bar"])).snap()
        attest(tm.array()(["foo", "bar"])).snap()
        attest(type([tn, tm])(["foo", "bar"])).snap()
    })
    test("path", () => {
        const t = type("string").morph((data, state) => {
            state.mustBe("a number", data, [])
        })
        attest(t("foo").problems).snap()
        attest(t.array()(["foo", "bar"]).problems).snap()
    })
    test("ok", () => {
        const t = type("string").narrow((data, state) => {
            if (!data.startsWith("foo")) {
                state.mustBe("start with 'foo'", data, [])
            }
            if (!data.endsWith("bar")) {
                state.mustBe("end with 'bar'", data, [])
            }
            return state.ok
        })
        attest(t("foo")).snap()
        attest(t("bar")).snap()
        attest(t("foobar")).snap()
    })
    test("inherit", () => {
        const a = type("'foo'")
        const t = type({ a: "string", b: "string", c: "string" }).narrow(
            (data, state) => {
                state.inherit(a(data.a), ["a"])
                state.inherit(a(data.b).problems, ["b"])
                state.inherit(a, ["c"], data)
                return state.ok
            }
        )
        attest(t({ a: "foo", b: "foo", c: "foo" })).snap()
        attest(t({ a: "bar", b: "bar", c: "bar" })).snap()
    })
    test.skip("no return")
})
