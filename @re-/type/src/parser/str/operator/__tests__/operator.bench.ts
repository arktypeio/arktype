import { bench, suite } from "@re-/assert"
import { dynamic, space, type } from "../../../../index.js"

const buildBranchDef = (token: string, size: number) =>
    [...Array(size - 1)].reduce((def, _, i) => `${def}${token}${i + 1}`, "0")

suite("parse/str/operator", () => {
    bench("list", () => {
        const _ = type("number[]")
    })
        .median()
        .type()

    bench("optional", () => {
        const _ = type("number?")
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

        const largeUnionDef = buildBranchDef("|", 100)
        bench("100-ary", () => {
            dynamic(largeUnionDef)
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

        const largeIntersectionDef = buildBranchDef("&", 100)
        bench("100-ary", () => {
            dynamic(largeIntersectionDef)
        }).median()
    })
})
