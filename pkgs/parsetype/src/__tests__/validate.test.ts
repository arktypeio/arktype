import { declare } from ".."

export const { define, compile } = declare("user", "group", "jorb", "foop")

const group = define.group({ a: "string", b: "user" })
const user = define.user({ a: "number", b: "group" })

const { types, parse } = compile(group, user, {
    jorb: "string",
    foop: "boolean"
})

const jorbEater = parse({ breakfast: "jorb", lunch: "jorb" })

describe("validation", () => {
    test("built-in", () => {})
})

// const getTypes = <Definitions extends DefinedTypeSet<Definitions>>(
//     t: Narrow<Definitions>
// ) => "" as any as ParseTypeSet<Definitions>

// type Store = ParseTypeSet<{
//     user: {
//         name: "string"
//         bestFriend: "user"
//         friends: "user[]"
//         groups: "group[]"
//         nested: {
//             another: "string"
//             user: "user[]"
//         }
//     }
//     group: {
//         name: "string"
//         description: "string?"
//         members: "user[]"
//         owner: "user"
//     }
// }>

// getTypes({
//     user: {
//         name: "string",
//         bestFriend: "user",
//         friends: "user[]",
//         groups: "group[]",
//         nested: {
//             another: "string",
//             user: "user[]"
//         }
//     },
//     group: {
//         name: "string",
//         description: "string?",
//         members: "user[]",
//         owner: "user"
//     }
// }).group.owner.nested.another
