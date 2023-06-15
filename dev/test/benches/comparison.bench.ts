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

// const dataArray = [...new Array(1000)].map((_, i) => ({
//     ...validInput,
//     number: i
// }))

const booleansAndNumbers = [...new Array(1000)].map(
    (_, i) => i % 3 || i % 2 === 0
)

const arkType = type({
    number: "number",
    negNumber: "number",
    maxNumber: "number",
    string: "string",
    longString: "string",
    // boolean: "boolean",
    deeplyNested: {
        foo: "string",
        num: "number"
        // bool: "boolean"
    }
})

console.log(arkType.toString())

console.log(arkType(validInput))

const switchCheck = ($arkRoot: any) => {
    switch ($arkRoot) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 21:
        case 22:
        case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 28:
        case 29:
        case 30:
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
        case 38:
        case 39:
        case 40:
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
        case 58:
        case 59:
        case 60:
        case 61:
        case 62:
        case 63:
        case 64:
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 92:
        case 93:
        case 94:
        case 95:
        case 96:
        case 97:
        case 98:
        case 99:
            break
        default:
            return false
    }
    return true
}

const breakCheck = ($arkRoot: any) => {
    switch ($arkRoot) {
        case 0: {
            break
        }
        case 1: {
            break
        }
        case 2: {
            break
        }
        case 3: {
            break
        }
        case 4: {
            break
        }
        case 5: {
            break
        }
        case 6: {
            break
        }
        case 7: {
            break
        }
        case 8: {
            break
        }
        case 9: {
            break
        }
        case 10: {
            break
        }
        case 11: {
            break
        }
        case 12: {
            break
        }
        case 13: {
            break
        }
        case 14: {
            break
        }
        case 15: {
            break
        }
        case 16: {
            break
        }
        case 17: {
            break
        }
        case 18: {
            break
        }
        case 19: {
            break
        }
        case 20: {
            break
        }
        case 21: {
            break
        }
        case 22: {
            break
        }
        case 23: {
            break
        }
        case 24: {
            break
        }
        case 25: {
            break
        }
        case 26: {
            break
        }
        case 27: {
            break
        }
        case 28: {
            break
        }
        case 29: {
            break
        }
        case 30: {
            break
        }
        case 31: {
            break
        }
        case 32: {
            break
        }
        case 33: {
            break
        }
        case 34: {
            break
        }
        case 35: {
            break
        }
        case 36: {
            break
        }
        case 37: {
            break
        }
        case 38: {
            break
        }
        case 39: {
            break
        }
        case 40: {
            break
        }
        case 41: {
            break
        }
        case 42: {
            break
        }
        case 43: {
            break
        }
        case 44: {
            break
        }
        case 45: {
            break
        }
        case 46: {
            break
        }
        case 47: {
            break
        }
        case 48: {
            break
        }
        case 49: {
            break
        }
        case 50: {
            break
        }
        case 51: {
            break
        }
        case 52: {
            break
        }
        case 53: {
            break
        }
        case 54: {
            break
        }
        case 55: {
            break
        }
        case 56: {
            break
        }
        case 57: {
            break
        }
        case 58: {
            break
        }
        case 59: {
            break
        }
        case 60: {
            break
        }
        case 61: {
            break
        }
        case 62: {
            break
        }
        case 63: {
            break
        }
        case 64: {
            break
        }
        case 65: {
            break
        }
        case 66: {
            break
        }
        case 67: {
            break
        }
        case 68: {
            break
        }
        case 69: {
            break
        }
        case 70: {
            break
        }
        case 71: {
            break
        }
        case 72: {
            break
        }
        case 73: {
            break
        }
        case 74: {
            break
        }
        case 75: {
            break
        }
        case 76: {
            break
        }
        case 77: {
            break
        }
        case 78: {
            break
        }
        case 79: {
            break
        }
        case 80: {
            break
        }
        case 81: {
            break
        }
        case 82: {
            break
        }
        case 83: {
            break
        }
        case 84: {
            break
        }
        case 85: {
            break
        }
        case 86: {
            break
        }
        case 87: {
            break
        }
        case 88: {
            break
        }
        case 89: {
            break
        }
        case 90: {
            break
        }
        case 91: {
            break
        }
        case 92: {
            break
        }
        case 93: {
            break
        }
        case 94: {
            break
        }
        case 95: {
            break
        }
        case 96: {
            break
        }
        case 97: {
            break
        }
        case 98: {
            break
        }
        case 99: {
            break
        }
        default:
            return false
    }
    return true
}

console.log(switchCheck(100))

bench("switchCheck", () => {
    switchCheck(99)
    switchCheck(100)
}).median([1.99, "ns"])

bench("breakCheck", () => {
    breakCheck(99)
    breakCheck(100)
}).median([3.55, "ns"])

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
