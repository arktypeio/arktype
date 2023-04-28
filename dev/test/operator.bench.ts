import { type } from "../../src/main.js"
import { bench, suite } from "../attest/main.js"

suite("operators", () => {
    suite("array", () => {
        bench("string", () => {
            const _ = type("number[]")
        })
            .median([3.18, "us"])
            .type([99, "instantiations"])

        bench("tuple", () => {
            const _ = type(["number", "[]"])
        })
            .median([3.47, "us"])
            .type([212, "instantiations"])

        bench("expression", () => {
            const _ = type("number").toArray()
        })
            .median([5.15, "us"])
            .type([5, "instantiations"])
    })

    suite("union", () => {
        bench("string", () => {
            const _ = type("number|string")
        })
            .median([7.07, "us"])
            .type([777, "instantiations"])

        bench("tuple", () => {
            const _ = type(["number", "|", "string"])
        })
            .median([5.59, "us"])
            .type([273, "instantiations"])

        bench("expression", () => {
            const _ = type("number").or("string")
        })
            .median([7.09, "us"])
            .type([488, "instantiations"])

        bench("10-ary", () => {
            const _ = type("0|1|2|3|4|5|6|7|8|9")
        })
            .median([119.87, "us"])
            .type([4841, "instantiations"])
    })

    suite("intersection", () => {
        bench("string", () => {
            const _ = type("number&0")
        })
            .median([3.61, "us"])
            .type([686, "instantiations"])

        bench("tuple", () => {
            const _ = type(["number", "&", "0"])
        })
            .median([3.16, "us"])
            .type([474, "instantiations"])

        bench("expression", () => {
            const _ = type("number").and("0")
        })
            .median([4.78, "us"])
            .type([687, "instantiations"])

        bench("10-ary", () => {
            const _ = type(
                "unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
            )
        })
            .median([12.61, "us"])
            .type([4351, "instantiations"])
    })

    suite("group", () => {
        bench("shallow", () => {
            const _ = type("string|(number[])")
        })
            .median([9.58, "us"])
            .type([1080, "instantiations"])

        bench("nested", () => {
            const _ = type("string|(number|(boolean))[][]")
        })
            .median([17.22, "us"])
            .type([3008, "instantiations"])

        bench("deep", () => {
            const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
        })
            .median([32.5, "us"])
            .type([37638, "instantiations"])
    })
    suite("bounds", () => {
        bench("single", () => {
            const _ = type("string>5")
        })
            .median([3.81, "us"])
            .type([615, "instantiations"])

        bench("double", () => {
            const _ = type("-7<=integer<99")
        })
            .median([7.2, "us"])
            .type([1041, "instantiations"])
    })
    bench("divisor", () => {
        const _ = type("number%5")
    })
        .median([4.53, "us"])
        .type([1023, "instantiations"])

    suite("narrow", () => {
        bench("tuple expression", () => {
            const _ = type(["boolean", "=>", (b) => b])
        })
            .median([8.04, "us"])
            .type([583, "instantiations"])
        bench("helper", () => {
            const _ = type("boolean").filter((b) => b)
        })
            .median([12.19, "us"])
            .type([42, "instantiations"])
    })
    suite("morph", () => {
        bench("tuple expression", () => {
            const _ = type(["boolean", "|>", (b) => b])
        })
            .median([8.96, "us"])
            .type([562, "instantiations"])
        bench("helper", () => {
            const _ = type("boolean").morph((b) => b)
        })
            .median([2.98, "us"])
            .type([26, "instantiations"])
    })
})
