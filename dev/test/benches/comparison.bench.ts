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

const dataArray = [...new Array(1000)].map((_, i) => ({
    ...validInput,
    number: i
}))

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

const anonymous = ($arkRoot: any): boolean => {
    if (
        !(
            (typeof $arkRoot === "object" && $arkRoot !== null) ||
            typeof $arkRoot === "function"
        )
    ) {
        return false
    }
    if (!($arkRoot.boolean === false || $arkRoot.boolean === true)) {
        return false
    }
    if (
        !(
            (typeof $arkRoot.deeplyNested === "object" &&
                $arkRoot.deeplyNested !== null) ||
            typeof $arkRoot.deeplyNested === "function"
        )
    ) {
        return false
    }
    if (
        !(
            $arkRoot.deeplyNested.bool === false ||
            $arkRoot.deeplyNested.bool === true
        )
    ) {
        return false
    }
    if (!(typeof $arkRoot.deeplyNested.foo === "string")) {
        return false
    }
    if (!(typeof $arkRoot.deeplyNested.num === "number")) {
        return false
    }
    if (!(typeof $arkRoot.longString === "string")) {
        return false
    }
    if (!(typeof $arkRoot.maxNumber === "number")) {
        return false
    }
    if (!(typeof $arkRoot.negNumber === "number")) {
        return false
    }
    if (!(typeof $arkRoot.number === "number")) {
        return false
    }
    if (!(typeof $arkRoot.string === "string")) {
        return false
    }
    return true
}

const chained = ($arkRoot: any): boolean =>
    ((typeof $arkRoot === "object" && $arkRoot !== null) ||
        typeof $arkRoot === "function") &&
    ($arkRoot.boolean === false || $arkRoot.boolean === true) &&
    ((typeof $arkRoot.deeplyNested === "object" &&
        $arkRoot.deeplyNested !== null) ||
        typeof $arkRoot.deeplyNested === "function") &&
    ($arkRoot.deeplyNested.bool === false ||
        $arkRoot.deeplyNested.bool === true) &&
    typeof $arkRoot.deeplyNested.foo === "string" &&
    typeof $arkRoot.deeplyNested.num === "number" &&
    typeof $arkRoot.longString === "string" &&
    typeof $arkRoot.maxNumber === "number" &&
    typeof $arkRoot.negNumber === "number" &&
    typeof $arkRoot.number === "number" &&
    typeof $arkRoot.string === "string"

// bench("anonymous", () => {
//     anonymous(validInput)
// }).median([2.1, "ns"])

bench("chained", () => {
    chained(validInput)
}).median([1.98, "ns"])

// bench("arktype", () => {
//     arkType.allows(validInput)
// }).median([2.42, "ns"])

// bench("arktype mutated", () => {
//     for (let i = 0; i < 1000; i++) {
//         arkType.allows(dataArray[i])
//     }
// }).median([11.4, "us"])

// =================== ZOD ========================= //

// const zodType = z.object({
//     number: z.number(),
//     negNumber: z.number(),
//     maxNumber: z.number(),
//     string: z.string(),
//     longString: z.string(),
//     boolean: z.boolean(),
//     deeplyNested: z.object({
//         foo: z.string(),
//         num: z.number(),
//         bool: z.boolean()
//     })
// })

// bench("zod", () => {
//     zodType.parse(validInput)
// }).median([1.13, "us"])

// bench("zod mutated", () => {
//     for (let i = 0; i < 1000; i++) {
//         zodType.parse(dataArray[i])
//     }
// }).median([1.25, "ms"])

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
// }).types([19654, "instantiations"])

// =================== Conditions vs. Ifs ========================= //

// const chained = ($arkRoot: any) =>
//     ((typeof $arkRoot === "object" && $arkRoot !== null) ||
//         typeof $arkRoot === "function") &&
//     ($arkRoot.boolean === false || $arkRoot.boolean === true) &&
//     ((typeof $arkRoot.deeplyNested === "object" &&
//         $arkRoot.deeplyNested !== null) ||
//         typeof $arkRoot.deeplyNested === "function") &&
//     ($arkRoot.deeplyNested.bool === false ||
//         $arkRoot.deeplyNested.bool === true) &&
//     typeof $arkRoot.deeplyNested.foo === "string" &&
//     typeof $arkRoot.deeplyNested.num === "number" &&
//     typeof $arkRoot.longString === "string" &&
//     typeof $arkRoot.maxNumber === "number" &&
//     typeof $arkRoot.negNumber === "number" &&
//     typeof $arkRoot.number === "number" &&
//     typeof $arkRoot.string === "string"

// const ifs = ($arkRoot: any) => {
//     if (
//         (typeof $arkRoot !== "object" || $arkRoot === null) &&
//         typeof $arkRoot !== "function"
//     ) {
//         return false
//     }
//     if ($arkRoot.boolean !== false && $arkRoot.boolean !== true) {
//         return false
//     }
//     if (
//         (typeof $arkRoot.deeplyNested !== "object" ||
//             $arkRoot.deeplyNested === null) &&
//         typeof $arkRoot.deeplyNested !== "function"
//     ) {
//         return false
//     }
//     if (
//         $arkRoot.deeplyNested.bool !== false &&
//         $arkRoot.deeplyNested.bool !== true
//     ) {
//         return false
//     }
//     if (typeof $arkRoot.deeplyNested.foo !== "string") {
//         return false
//     }
//     if (typeof $arkRoot.deeplyNested.num !== "number") {
//         return false
//     }

//     if (typeof $arkRoot.longString !== "string") {
//         return false
//     }
//     if (typeof $arkRoot.maxNumber !== "number") {
//         return false
//     }
//     if (typeof $arkRoot.negNumber !== "number") {
//         return false
//     }
//     if (typeof $arkRoot.number !== "number") {
//         return false
//     }
//     if (typeof $arkRoot.string !== "string") {
//         return false
//     }
//     return true
// }

// bench("chained", () => {
//     chained(validInput)
// }).median([2.18, "ns"])

// bench("ifs", () => {
//     ifs(validInput)
// }).median([3.88, "ns"])

// bench("chained mutated", () => {
//     for (let i = 0; i < 1000; i++) {
//         chained(dataArray[i])
//     }
// }).median([10.3, "us"])

// bench("ifs mutated", () => {
//     for (let i = 0; i < 1000; i++) {
//         ifs(dataArray[i])
//     }
// }).median([10.28, "us"])
