import { createState } from "../state.js"

function createTestState() {
    return createState(
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

let state: ReturnType<typeof createTestState>

const scratch = () => {
    const { id } = state.users.create({
        name: "Hi",
        groups: [],
        favoriteColor: 0,
        address: {
            street: "Sagamore Rd",
            number: 120,
            city: {
                users: [],
                groups: [1],
                adjacentCities: []
            }
        }
    })

    state.users.find({ id: 5 })
    state.users.find(({ name }) => name === "ME")
    state.users.filter({ favoriteColor: { RGB: "255,255,255" } })
    state.users.filter(
        ({ groups }) => !!groups.find((_) => _.name === "Adventurer's Club")
    )

    const z = state.users.with({ id: 5 }).remove()
    const y = state.users
        .where({ name: "David" })
        .update({ name: "David Blass" })
}

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

describe("state", () => {
    beforeEach(() => {
        state = createTestState()
    })
    test("get primitive", () => {
        expect(state.preferences.darkMode).toBe(false)
    })
    test("set primitive", () => {
        state.preferences.darkMode = true
        expect(state.preferences.darkMode).toBe(true)
    })
    test("get object", () => {
        expect(state.preferences).toStrictEqual(initial.preferences)
    })
    test("set object", () => {
        const updatedValue = {
            darkMode: true,
            font: { family: "Ubuntu", size: 16 }
        }
        state.preferences = updatedValue
        expect(state.preferences).toStrictEqual(updatedValue)
    })
})

describe("stored types", () => {
    beforeEach(() => {
        state = createTestState()
    })
    test("create", () => {
        state.nestedStore.colors.create({ RGB: "255,255,255" })
        expect(state.nestedStore.colors.all()).toStrictEqual([
            {
                RGB: "255,255,255",
                id: 1
            }
        ])
    })
})
