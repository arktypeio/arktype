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
    const expectedDeepUserShallow = {
        ...deepUserData,
        friends: [1],
        id: 2
    }
    const expectedDeepUserDeep = {
        ...expectedDeepUserShallow,
        friends: [expectedShallowUser]
    }
    const bothExpectedUsersShallow = [
        expectedShallowUser,
        expectedDeepUserShallow
    ]
    test("deep", () => {
        expect(db.users.create(deepUserData)).toStrictEqual(
            expectedDeepUserDeep
        )
        expect(db.users.all({ unpack: false })).toStrictEqual(
            bothExpectedUsersShallow
        )
    })

    test("deep no unpack", () => {
        expect(db.users.create(deepUserData, { unpack: false })).toStrictEqual(
            expectedDeepUserShallow
        )
    })
    const expectedDeepGroupShallow = { ...deepGroupData, users: [2], id: 1 }
    const expectedDeepGroupDeep = {
        ...expectedDeepGroupShallow,
        users: [expectedDeepUserDeep]
    }
    test("deep multitype", () => {
        expect(db.groups.create(deepGroupData)).toStrictEqual(
            expectedDeepGroupDeep
        )
        expect(db.groups.all({ unpack: false })).toStrictEqual([
            expectedDeepGroupShallow
        ])
        expect(db.users.all({ unpack: false })).toStrictEqual(
            bothExpectedUsersShallow
        )
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
    const expectedDeepGroupData = {
        ...deepGroupData,
        id: 1,
        users: [
            {
                ...deepUserData,
                id: 2,
                friends: [{ ...shallowUserData, id: 1 }]
            }
        ]
    }
    test("unpacks deep values", () => {
        db.groups.create(deepGroupData)
        expect(
            db.groups.find((group) => group.name === deepGroupData.name)
        ).toStrictEqual(expectedDeepGroupData)
    })
})
