import { type } from "../../../src/main.js"
import { bench } from "../../attest/main.js"

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

// bench("ark instantiations", () => {
//     const arkType = type({
//         number: "number",
//         negNumber: "number",
//         maxNumber: "number",
//         string: "string",
//         longString: "string",
//         boolean: "boolean",
//         deeplyNested: {
//             foo: "string",
//             num: "number",
//             bool: "boolean"
//         }
//     })
// }).types([6016, "instantiations"])

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

// bench("arktype", () => {
//     arkType.root.allows(validInput)
// }).median([8, "ns"])

bench("arktype", () => {
    arkType.root.allows(validInput)
}).median([2.42, "ns"])

// import z from "zod"

// bench("zod instantiations", () => {
//     const zodType = z.object({
//         number: z.number(),
//         negNumber: z.number(),
//         maxNumber: z.number(),
//         string: z.string(),
//         longString: z.string(),
//         boolean: z.boolean(),
//         deeplyNested: z.object({
//             foo: z.string(),
//             num: z.number(),
//             bool: z.boolean()
//         })
//     })
// }).types([19688, "instantiations"])

// bench("zod", () => {
//     for (let i = 0; i < 1000; i++) {
//         zodType.parse(dataArray[i])
//     }
// }).median([1.12, "ms"])
