import { assert } from "@re-/assert"
import { createStore } from ".."
import { createMemoryDb } from "../db.js"
import { ParseStoredType } from "../store.js"

const init = () => {
    const db = createMemoryDb({ user: [] as any[] })
    const store = createStore(
        {
            user: {
                name: "string"
            }
        },
        { db }
    )
    return {
        db,
        store
    }
}

describe("store", () => {
    test("init", () => {
        const { db, store } = init()
        assert(db.all({ typeName: "user" })).equals([])
        assert(store.user.all()).equals([])
    })
    test("create", () => {
        const { db, store } = init()
        store.user.create({ name: "David Blass" })
        assert(db.all({ typeName: "user" })).equals([
            {
                name: "David Blass",
                id: 0
            }
        ])
        assert(store.user.all()).equals([
            {
                name: "David Blass",
                id: 0
            }
        ])
    })
})
