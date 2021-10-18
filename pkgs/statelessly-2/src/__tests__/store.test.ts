import { createStore } from "../createStore.js"

function createTestStore() {
    return createStore(
        {
            users: {
                defines: "user",
                fields: {
                    name: {
                        type: "string",
                        onChange: () => ":-)"
                    },
                    groups: {
                        type: "group[]",
                        onChange: () => {}
                    },
                    bestFriend: "user?",
                    favoriteColor: "color",
                    address: {
                        fields: {
                            street: "string",
                            number: "number",
                            unit: "number?",
                            city: "city"
                        }
                    }
                }
            },
            groups: {
                defines: "group",
                fields: {
                    name: {
                        type: "string",
                        onChange: (_) => ""
                    },
                    members: {
                        type: "user[]"
                    }
                }
            },
            preferences: {
                fields: {
                    darkMode: "boolean",
                    colors: {
                        stores: "color"
                    },
                    others: {
                        defines: "other",
                        type: {
                            other: "string"
                        }
                    }
                }
            },
            cache: {
                fields: {
                    currentUser: "user|null",
                    currentCity: "city",
                    lastObject: "user|group?",
                    cityOrUser: "user|city"
                }
            }
        },
        {
            typeSet: {
                city: {
                    users: "user[]",
                    groups: "group[]",
                    adjacentCities: "city[]"
                },
                color: {
                    RGB: "string"
                }
            }
        }
    )
}

// const { id } = getStore().users.create({
//     name: "Hi",
//     groups: [],
//     favoriteColor: 0,
//     address: {
//         street: "Sagamore Rd",
//         number: 120,
//         city: {
//             users: [],
//             groups: [1],
//             adjacentCities: []
//         }
//     }
// })

// store.users.find({ id: 5 })
// store.users.find(({ name }) => name === "ME")
// store.users.filter({ favoriteColor: { RGB: "255,255,255" } })
// store.users.filter(
//     ({ groups }) => !!groups.find((_) => _.name === "Adventurer's Club")
// )

// const z = store.users.with({ id: 5 }).remove()
// const y = store.users.where({ id: 5 }).remove()

let testStore: ReturnType<typeof createTestStore>

describe("createStore", () => {
    beforeEach(() => {
        testStore = createTestStore()
    })
    test("works", () => {
        expect(testStore).toStrictEqual("hi")
    })
})
