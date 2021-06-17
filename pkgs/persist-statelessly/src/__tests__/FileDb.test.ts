import { rmSync } from "fs"
import { join } from "path"
import { createFileDb, FileDb, MappedKeys } from ".."

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

const deepUserData: User = {
    name: "Mister Deep",
    friends: [shallowUserData],
    groups: []
}

const deepGroupData: Group = {
    name: "Adventurer's Club",
    description: "The most daring individuals in the world",
    users: [deepUserData]
}

type Root = typeof fallback

const mappedKeys: MappedKeys<Root> = {
    users: {
        friends: "users"
    }
}

let db: FileDb<Root>

describe("persist", () => {
    beforeEach(() => {
        rmSync(path)
        db = createFileDb({
            fallback,
            path,
            mappedKeys,
            bidirectional: false
        })
    })
    test("shallow", () => {
        db.users.persist(shallowUserData)
        expect(db.users.retrieve()).toStrictEqual([
            { ...shallowUserData, id: 0 }
        ])
    })
    const expectedDeepUsers = [
        { ...shallowUserData, id: 0 },
        { ...deepUserData, friends: [0], id: 0 }
    ]
    test("deep", () => {
        db.users.persist(deepUserData)
        expect(db.users.retrieve()).toStrictEqual(expectedDeepUsers)
    })
    test("deep multitype", () => {
        db.groups.persist(deepGroupData)
        expect(db.groups.retrieve()).toStrictEqual([
            { ...deepGroupData, users: [0], id: 0 }
        ])
        expect(db.users.retrieve()).toStrictEqual(expectedDeepUsers)
    })
})
