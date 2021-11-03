import { rmSync } from "fs"
import { join } from "path"
import { createFileDb, FileDb, Relationships, FileDbArgs } from "../.."

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

const relationships: Relationships<Root> = {
    users: { friends: "users", groups: "groups" },
    groups: { users: "users" }
}

let db: FileDb<Root>

const getDb = (opts: Partial<FileDbArgs<Root>> = {}) => {
    rmSync(path)
    return createFileDb<Root>({
        relationships,
        path,
        bidirectional: false,
        onNoFile: () => ({ users: [], groups: [] }),
        ...opts
    })
}
const expectedShallowUser = { ...shallowUserData, id: 1 }
const expectedDeepUserShallow = {
    ...deepUserData,
    friends: [1],
    id: 2
}
const expectedDeepUserDeep = {
    ...expectedDeepUserShallow,
    friends: [expectedShallowUser]
}
const bothExpectedUsersShallow = [expectedShallowUser, expectedDeepUserShallow]

const expectedShallowUserWithDeepFriendShallow = {
    ...expectedShallowUser,
    friends: [2]
}
const expectedShallowUserWithDeepFriendDeep = {
    ...expectedShallowUser,
    friends: [expectedDeepUserShallow]
}

const expectedDeepGroupShallow = { ...deepGroupData, users: [2], id: 1 }
const expectedDeepGroupDeep = {
    ...expectedDeepGroupShallow,
    users: [expectedDeepUserDeep]
}

describe("create", () => {
    beforeEach(() => {
        db = getDb()
    })
    test("shallow", () => {
        expect(db.users.create(shallowUserData)).toStrictEqual(
            expectedShallowUser
        )
        expect(db.users.all()).toStrictEqual([expectedShallowUser])
    })
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
    test("doesn't create object matching existing function", () => {
        db = getDb({
            reuseExisting: {
                users: (newUser, existingUser) =>
                    existingUser.name === newUser.name
            }
        })
        db.users.create(shallowUserData)
        db.users.create(shallowUserData)
        expect(db.users.all()).toStrictEqual([expectedShallowUser])
    })
    test("doesn't create object matching existing boolean", () => {
        db = getDb({
            reuseExisting: {
                groups: true,
                users: true
            }
        })
        db.groups.create(deepGroupData)
        db.groups.create(deepGroupData)
        expect(db.groups.all({ unpack: false })).toStrictEqual([
            expectedDeepGroupShallow
        ])
    })
})

describe("find", () => {
    beforeEach(() => {
        db = getDb()
    })
    test("can retrieve all values of a given type", () => {
        db.users.create(deepUserData)
        expect(db.users.all({ unpack: false })).toStrictEqual(
            bothExpectedUsersShallow
        )
    })
    test("unpacks deep values by default", () => {
        db.groups.create(deepGroupData)
        expect(
            db.groups.find((group) => group.name === deepGroupData.name)
        ).toStrictEqual(expectedDeepGroupDeep)
    })
    test("can find shallow values", () => {
        db.groups.create(deepGroupData)
        expect(
            db.groups.find((group) => group.name === deepGroupData.name, {
                unpack: false
            })
        ).toStrictEqual(expectedDeepGroupShallow)
    })
    test("can filter values of a given type", () => {
        db.groups.create(deepGroupData)
        expect(
            db.groups.filter((group) => group.name === deepGroupData.name)
        ).toStrictEqual([expectedDeepGroupDeep])
    })
    test("doesn't unpack the same value twice", () => {
        db.users.create(deepUserData)
        db.users.update((user) => user.id === 1, { friends: [2] })
        expect(db.users.all()).toStrictEqual([
            expectedShallowUserWithDeepFriendDeep,
            {
                ...expectedDeepUserShallow,
                friends: [expectedShallowUserWithDeepFriendShallow]
            }
        ])
    })
})

describe("delete", () => {
    beforeEach(() => {
        db = getDb()
    })
    test("deletes shallow values", () => {
        db.users.create(shallowUserData)
        db.users.remove((user) => user.name === shallowUserData.name)
        expect(db.users.all()).toStrictEqual([])
    })
    test("deletes all references to the deleted object", () => {
        db.users.create(deepUserData)
        db.users.remove((user) => user.name === shallowUserData.name)
        expect(db.users.all({ unpack: false })).toStrictEqual([
            {
                ...expectedDeepUserShallow,
                friends: []
            }
        ])
    })
    test("deletes references across object types", () => {
        db.groups.create(deepGroupData)
        db.groups.remove((group) => group.name === deepGroupData.name)
        expect(db.groups.all({ unpack: false })).toStrictEqual([])
        expect(db.users.all({ unpack: false })).toStrictEqual(
            bothExpectedUsersShallow
        )
    })
})

describe("update", () => {
    beforeEach(() => {
        db = getDb()
    })
    test("shallow", () => {
        db.users.create(shallowUserData)
        db.users.update((user) => user.id === 1, { name: "Monsieur Shallow" })
        expect(db.users.all({ unpack: false })).toStrictEqual([
            { ...expectedShallowUser, name: "Monsieur Shallow" }
        ])
    })
    test("update to id", () => {
        db.users.create(deepUserData)
        db.users.update((user) => user.id === 1, {
            friends: (_) => _.concat(2)
        })
        expect(
            db.users.find((user) => user.id === 1, { unpack: false })
        ).toStrictEqual(expectedShallowUserWithDeepFriendShallow)
    })
})
