import {} from ".."

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
