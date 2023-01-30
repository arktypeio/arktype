import { type } from "../api.ts"
import { bench, suite } from "../dev/attest/api.ts"

const writeBranchDef = (token: string, size: number) =>
    [...Array(size - 1)].reduce((def, _, i) => `${def}${token}${i + 1}`, "0")

suite("parse/str/operator", () => {
    bench("array", () => {
        const _ = type("number[]")
    })
        .median()
        .type()

    suite("union", () => {
        bench("binary", () => {
            const _ = type("number|string")
        })
            .median()
            .type()

        bench("10-ary", () => {
            const _ = type("0|1|2|3|4|5|6|7|8|9")
        })
            .median()
            .type()

        const largeUnionDef = writeBranchDef("|", 100)
        bench("100-ary", () => {
            type(largeUnionDef)
        }).median()
    })

    suite("intersection", () => {
        bench("binary", () => {
            const _ = type("number&0")
        })
            .median()
            .type()

        bench("10-ary", () => {
            const _ = type("0&1&2&3&4&5&6&7&8&9")
        })
            .median()
            .type()

        const largeIntersectionDef = writeBranchDef("&", 100)
        bench("100-ary", () => {
            type(largeIntersectionDef)
        }).median()
    })

    suite("group", () => {
        bench("shallow", () => {
            const _ = type("string|(number[])")
        })
            .median()
            .type()

        bench("nested", () => {
            const _ = type("string|(number|(boolean))[][]")
        })
            .median()
            .type()

        bench("deep", () => {
            const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
        })
            .median()
            .type()
    })
    suite("bounds", () => {
        bench("single-bounded", () => {
            const _ = type("string>5")
        })
            .median()
            .type()

        bench("double-bounded", () => {
            const _ = type("-7<=integer<99")
        })
            .median()
            .type()
    })
})
