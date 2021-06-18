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

const getDb = () => {
    rmSync(path)
    return createFileDb({
        fallback,
        path,
        mappedKeys,
        bidirectional: false
    })
}

describe("create", () => {
    beforeEach(() => {
        db = getDb()
    })
    const expectedShallowUser = { ...shallowUserData, id: 1 }
    test("shallow", () => {
        expect(db.users.create(shallowUserData)).toStrictEqual(
            expectedShallowUser
        )
        expect(db.users.all()).toStrictEqual([expectedShallowUser])
    })
    const expectedDeepUser = { ...deepUserData, friends: [1], id: 2 }
    const bothExpectedUsers = [expectedShallowUser, expectedDeepUser]
    test("deep", () => {
        expect(db.users.create(deepUserData)).toStrictEqual(expectedDeepUser)
        expect(db.users.all()).toStrictEqual(bothExpectedUsers)
    })
    const expectedDeepGroup = { ...deepGroupData, users: [2], id: 1 }
    test("deep multitype", () => {
        expect(db.groups.create(deepGroupData)).toStrictEqual(expectedDeepGroup)
        expect(db.groups.all()).toStrictEqual([expectedDeepGroup])
        expect(db.users.all()).toStrictEqual(bothExpectedUsers)
    })
    test("errors on unknown object", () => {
        expect(() =>
            db.users.create({ ...shallowUserData, unknown: {} } as any)
        ).toThrow()
    })
})

describe("find", () => {
    beforeEach(() => {
        db = getDb()
    })
    test("unpacks deep values", () => {
        db.groups.create(deepGroupData)
        expect(
            db.groups.find((_) => _.name === deepGroupData.name)
        ).toStrictEqual(deepGroupData)
    })
})
