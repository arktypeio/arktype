import { type } from "../api.ts"
import { bench, suite } from "../dev/attest/api.ts"

suite("parse/str/operator", () => {
    bench("array", () => {
        const _ = type("number[]")
    })
        .median([934, "ns"])
        .type([900, "instantiations"])

    suite("union", () => {
        bench("binary", () => {
            const _ = type("number|string")
        })
            .median([498, "ns"])
            .type([817, "instantiations"])

        bench("10-ary", () => {
            const _ = type("0|1|2|3|4|5|6|7|8|9")
        })
            .median([16.64, "us"])
            .type([5605, "instantiations"])
    })

    suite("intersection", () => {
        bench("binary", () => {
            const _ = type("number&0")
        })
            .median([511, "ns"])
            .type([787, "instantiations"])

        bench("10-ary", () => {
            const _ = type(
                "unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
            )
        })
            .median([707, "ns"])
            .type([4131, "instantiations"])
    })

    suite("group", () => {
        bench("shallow", () => {
            const _ = type("string|(number[])")
        })
            .median([1.04, "us"])
            .type([1121, "instantiations"])

        bench("nested", () => {
            const _ = type("string|(number|(boolean))[][]")
        })
            .median([1.44, "us"])
            .type([3308, "instantiations"])

        bench("deep", () => {
            const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
        })
            .median([5.34, "us"])
            .type([36744, "instantiations"])
    })
    suite("bounds", () => {
        bench("single-bounded", () => {
            const _ = type("string>5")
        })
            .median([616, "ns"])
            .type([682, "instantiations"])

        bench("double-bounded", () => {
            const _ = type("-7<=integer<99")
        })
            .median([780, "ns"])
            .type([1088, "instantiations"])
    })
})
