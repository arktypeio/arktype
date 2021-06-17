import { rmSync } from "fs"
import { join } from "path"
import { createFileDb, FileDb } from ".."

const path = join(__dirname, "store.json")

type User = {
    name: string
    friends: User[]
    groups: Group[]
}

type Group = {
    name: string
    description: string
    users: User[]
}

const fallback = {
    users: [] as User[],
    groups: [] as Group[]
}

const shallowUserData: User = {
    name: "Mister Shallow",
    friends: [],
    groups: []
}

const groupData: Group = {
    name: "Adventurer's Club",
    description: "The most daring individuals in the world",
    users: []
}

const deepUserData: User = {
    name: "Mister Deep",
    friends: [shallowUserData],
    groups: []
}

type Root = typeof fallback

let db: FileDb<Root>

describe("persist", () => {
    beforeEach(() => {
        rmSync(path)
        db = createFileDb({
            fallback,
            path,
            bidirectional: false
        })
    })
    test("shallow", () => {
        db.users.persist(shallowUserData)
        expect(db.users.retrieve()).toStrictEqual([
            { ...shallowUserData, id: 0 }
        ])
    })
    test("deep", () => {
        db.users.persist(deepUserData)
        expect(db.users.retrieve()).toStrictEqual([
            { ...shallowUserData, id: 0 },
            { ...deepUserData, friends: [0], id: 0 }
        ])
    })
})
