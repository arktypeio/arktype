import { createStore, Handler, Actions, StoreOptions } from "../store"

type Root = {
    a: A
    b: boolean
    c: string
    d: A[]
}

type A = {
    a: number
    b: B
}

type B = {
    a: number[]
}
const initialA: A = Object.freeze({
    a: 0,
    b: {
        a: [0]
    }
})

const initialRoot: Root = Object.freeze({
    a: initialA,
    b: false,
    c: "",
    d: [initialA, initialA]
})

const getStore = (options: StoreOptions<Root> = {}) =>
    createStore(
        initialRoot,
        {
            enableB: { b: true },
            nameC: (name: string) => ({
                c: name
            }),
            addOneToEndOfList: {
                a: { b: { a: (_) => [..._, 1] } }
            },
            addNumberToEndOfList: (value: number) => ({
                a: { b: { a: (_) => [..._, value] } }
            }),
            appendObjectToArray: { d: (value) => value.concat(initialA) },
            emptyDArray: { d: [] },
            updateSomeValues: {
                b: (_) => _,
                c: (_) => `updated${_}`
            }
        },
        options
    )

let store = getStore()

describe("queries", () => {
    beforeAll(() => {
        store = getStore()
    })
    test("handle shallow", () => {
        expect(store.query({ b: true })).toStrictEqual({ b: false })
    })
    test("handle deep", () => {
        expect(store.query({ a: true })).toStrictEqual({ a: initialA })
    })
    test("handle object arrays", () => {
        expect(store.query({ d: true })).toStrictEqual({
            d: [initialA, initialA]
        })
    })
    test("handle filtered object within array", () => {
        expect(store.query({ d: { a: true } })).toStrictEqual({
            d: [{ a: 0 }, { a: 0 }]
        })
    })
    test("don't include extraneous keys", () => {
        expect(store.query({ a: { a: true } })).toStrictEqual({
            a: { a: initialA.a }
        })
    })
})

describe("gets", () => {
    beforeAll(() => {
        store = getStore()
    })
    test("shallow", () => {
        expect(store.get("c")).toBe("")
    })
    test("nested", () => {
        expect(store.get("a/b/a")).toStrictEqual([0])
    })
    test("from array", () => {
        expect(store.get("d/0/a")).toBe(0)
    })
})

describe("actions", () => {
    beforeEach(() => {
        store = getStore()
    })
    test("shallow set value", () => {
        store.enableB()
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            b: true
        })
    })
    test("shallow set function", () => {
        store.nameC("redo")
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            c: "redo"
        })
    })
    test("deep set value", () => {
        store.addOneToEndOfList()
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            a: {
                ...initialRoot.a,
                b: {
                    ...initialRoot.a.b,
                    a: initialRoot.a.b.a.concat([1])
                }
            }
        })
    })
    test("deep set function", () => {
        store.addNumberToEndOfList(5)
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            a: {
                ...initialRoot.a,
                b: {
                    ...initialRoot.a.b,
                    a: initialRoot.a.b.a.concat([5])
                }
            }
        })
    })
    test("handles object arrays", () => {
        store.appendObjectToArray()
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            d: [initialA, initialA, initialA]
        })
    })
    test("sets array value", () => {
        store.emptyDArray()
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            d: []
        })
    })
})

const cHandler = jest.fn()
const bing = jest.fn()
const dHandler = jest.fn()
const handler: Handler<Root, Root> = {
    c: cHandler,
    b: bing,
    d: dHandler
}

const functionalHandler = jest.fn()

describe("side effects", () => {
    beforeEach(() => {
        store = getStore({ handler })
    })
    test("handle side effects", () => {
        store.enableB()
        expect(bing).toBeCalledWith(true, initialRoot)
    })
    test("handles array side effects", () => {
        store.appendObjectToArray()
        expect(dHandler).toBeCalledWith(
            [initialA, initialA, initialA],
            initialRoot
        )
    })
    test("doesn't trigger extraneous side effects", () => {
        store.updateSomeValues()
        expect(cHandler).toHaveBeenCalled()
        expect(bing).not.toHaveBeenCalled()
    })
    test("handles side effects with function", () => {
        store = getStore({ handler: functionalHandler })
        store.enableB()
        expect(functionalHandler).toHaveBeenCalledWith({ b: true }, initialRoot)
    })
})
