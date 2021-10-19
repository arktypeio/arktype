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
            nestedStore: {
                fields: {
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
            preferences: {
                fields: {
                    darkMode: "boolean",
                    background: "color?",
                    font: {
                        fields: {
                            family: "string",
                            size: "number"
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

// const store = createTestStore()

// const { id } = store.users.create({
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
// const y = store.users.where({ name: "David" }).update({ name: "David Blass" })

let store: ReturnType<typeof createTestStore>

const initial = {
    users: [],
    groups: [],
    nestedStore: { colors: [], others: [] },
    preferences: { darkMode: false, font: { family: "", size: 0 } },
    cache: {
        currentUser: null,
        currentCity: { users: [], groups: [], adjacentCities: [] },
        cityOrUser: {
            name: "",
            groups: [],
            favoriteColor: { RGB: "", id: 0 },
            address: {
                street: "",
                number: 0,
                city: { users: [], groups: [], adjacentCities: [] }
            },
            id: 0
        }
    }
}

describe("createStore", () => {
    beforeEach(() => {
        store = createTestStore()
    })
    test("default value", () => {
        expect(store).toStrictEqual(initial)
    })
    test("get primitive", () => {
        expect(store.preferences.darkMode).toBe(false)
    })
    test("set primitive", () => {
        store.preferences.darkMode = true
        expect(store.preferences.darkMode).toBe(true)
    })
    test("get object", () => {
        expect(store.preferences).toStrictEqual(initial.preferences)
    })
    test("set object", () => {
        const updatedValue = {
            darkMode: true,
            font: { family: "Ubuntu", size: 16 }
        }
        store.preferences = updatedValue
        expect(store.preferences).toStrictEqual(updatedValue)
    })
})
