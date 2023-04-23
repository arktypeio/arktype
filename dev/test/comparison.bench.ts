import z from "zod"
import { type } from "../../src/main.js"
import { bench } from "../attest/main.js"

const validInput = {
    number: 1,
    negNumber: -1,
    maxNumber: Number.MAX_VALUE,
    string: "string",
    longString:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    boolean: true,
    deeplyNested: {
        foo: "bar",
        num: 1,
        bool: false
    }
}

bench("ark instantiations", () => {
    const arkType = type({
        number: "number",
        negNumber: "number",
        maxNumber: "number",
        string: "string",
        longString: "string",
        boolean: "boolean",
        deeplyNested: {
            foo: "string",
            num: "number",
            bool: "boolean"
        }
    })
}).type([6016, "instantiations"])

bench("zod instantiations", () => {
    const zodType = z.object({
        number: z.number(),
        negNumber: z.number(),
        maxNumber: z.number(),
        string: z.string(),
        longString: z.string(),
        boolean: z.boolean(),
        deeplyNested: z.object({
            foo: z.string(),
            num: z.number(),
            bool: z.boolean()
        })
    })
}).type([19688, "instantiations"])

// const arkCheck = (data: any) => {
//     const state = new (globalThis as any).$ark.state()
//     if (
//         !(
//             (typeof data === "object" && data !== null) ||
//             typeof data === "function"
//         )
//     ) {
//         state.addProblem("domain", "object", data, [])
//     }
//     // state.pushUnion()
//     // ;(() => {
//     //     if (!(data.boolean === true)) {
//     //         return state.addProblem("value", ["===", true], data.boolean, [])
//     //     }
//     // })() &&
//     //     (() => {
//     //         if (!(data.boolean === false)) {
//     //             return state.addProblem(
//     //                 "value",
//     //                 ["===", false],
//     //                 data.boolean,
//     //                 []
//     //             )
//     //         }
//     //     })()
//     // state.popUnion(2, data.boolean, [])
//     // if (
//     //     !(
//     //         (typeof data.deeplyNested === "object" &&
//     //             data.deeplyNested !== null) ||
//     //         typeof data.deeplyNested === "function"
//     //     )
//     // ) {
//     //     state.addProblem("domain", "object", data.deeplyNested, [])
//     // }
//     // state.pushUnion()
//     // ;(() => {
//     //     if (!(data.deeplyNested.bool === true)) {
//     //         return state.addProblem(
//     //             "value",
//     //             ["===", true],
//     //             data.deeplyNested.bool,
//     //             []
//     //         )
//     //     }
//     // })() &&
//     //     (() => {
//     //         if (!(data.deeplyNested.bool === false)) {
//     //             return state.addProblem(
//     //                 "value",
//     //                 ["===", false],
//     //                 data.deeplyNested.bool,
//     //                 []
//     //             )
//     //         }
//     //     })()
//     // state.popUnion(2, data.deeplyNested.bool, [])
//     if (!(typeof data.boolean === "boolean")) {
//         state.addProblem("domain", "boolean", data.boolean, [])
//     }
//     if (!(typeof data.deeplyNested.bool === "boolean")) {
//         state.addProblem("domain", "boolean", data.deeplyNested.bool, [])
//     }
//     if (!(typeof data.deeplyNested.foo === "string")) {
//         state.addProblem("domain", "string", data.deeplyNested.foo, [])
//     }
//     if (!(typeof data.deeplyNested.num === "number")) {
//         state.addProblem("domain", "number", data.deeplyNested.num, [])
//     }
//     if (!(typeof data.longString === "string")) {
//         state.addProblem("domain", "string", data.longString, [])
//     }
//     if (!(typeof data.maxNumber === "number")) {
//         state.addProblem("domain", "number", data.maxNumber, [])
//     }
//     if (!(typeof data.negNumber === "number")) {
//         state.addProblem("domain", "number", data.negNumber, [])
//     }
//     if (!(typeof data.number === "number")) {
//         state.addProblem("domain", "number", data.number, [])
//     }
//     if (!(typeof data.string === "string")) {
//         state.addProblem("domain", "string", data.string, [])
//     }
//     return state.finalize(data)
// }

// const dataArray = [...new Array(1000)].map((_, i) => ({
//     ...validInput,
//     number: i
// }))

// bench("arktype", () => {
//     for (let i = 0; i < 1000; i++) {
//         arkType(dataArray[i])
//     }
// }).median([600, "us"])

// bench("arktype check", () => {
//     for (let i = 0; i < 1000; i++) {
//         arkCheck(dataArray[i])
//     }
// }).median([46.16, "us"])

// bench("arktype allows", () => {
//     for (let i = 0; i < 1000; i++) {
//         arkType.root(dataArray[i])
//     }
// }).median([6.77, "us"])

// bench("zod", () => {
//     for (let i = 0; i < 1000; i++) {
//         zodType.parse(dataArray[i])
//     }
// }).median([1.12, "ms"])
