// @ts-ignore
import { format } from "prettier"
import { scope, type } from "../../src/main.js"

// const benchData = {
//     number: 1,
//     negNumber: -1,
//     maxNumber: Number.MAX_VALUE,
//     string: "string",
//     longString:
//         "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
//     boolean: true,
//     deeplyNested: {
//         foo: "bar",
//         num: 5,
//         bool: false
//     }
// }

// const myType = type({ even: "number%2" })

// const benchType = type({
//     number: "number",
//     negNumber: "number",
//     maxNumber: "number",
//     string: "string",
//     longString: "string",
//     boolean: "boolean",
//     deeplyNested: {
//         foo: "string",
//         num: "number",
//         bool: "boolean"
//     }
// })

// const boolean = type("boolean")

// console.log(boolean(5))

// console.log(format(benchType.allows.toString()))

// const result2 = benchType.allows(benchData)

// console.log(result2)

// console.log(format(benchType.toString()))

// console.log(format(myType.toString()))

// const result = benchType(benchData)

// console.log(result.problems?.summary)

// try {
//     benchType({})
// } catch (e) {
//     console.log(e)
// }

// const sn = type("string|number")

// console.log(sn.allows.toString())

const places = scope({
    rainForest: {
        climate: "'wet'",
        color: "'green'",
        isRainForest: "true"
    },
    desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
    sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
    ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" }
})

const t = places.type("rainForest|desert|sky|ocean")

console.log(format(t.allows.toString()))

console.log(t.allows({ climate: "'wet'" }))
