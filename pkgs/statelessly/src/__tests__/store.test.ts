import { createStore, Handler } from "../store"

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

const getStore = () =>
    createStore(initialRoot, {
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
        emptyDArray: { d: [] }
    })

let store = getStore()

// const cHandler = jest.fn()
// const bing = jest.fn()
// const dHandler = jest.fn()
// const handler: Handler<Root, Root> = {
//     c: cHandler,
//     b: bing,
//     d: dHandler
// }
// let sideEffectStore = createStore({
//     initial: initialRoot,
//     handler,
//     actions: {}
// })

// const functionalHandler = jest.fn()
// let sideEffectFunctionStore = createStore({
//     initial: initialRoot,
//     handler: functionalHandler,
//     actions: {}
// })

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

// describe("side effects", () => {
//     beforeEach(() => {
//         sideEffectStore = createStore({ initial: initialRoot, handler })
//     })
//     test("handle side effects", () => {
//         sideEffectStore.update({ b: true })
//         expect(bing).toBeCalledWith(true, initialRoot)
//     })
//     test("handles array side effects", () => {
//         sideEffectStore.update({
//             d: (_) => _.concat(initialA)
//         })
//         expect(dHandler).toBeCalledWith(
//             [initialA, initialA, initialA],
//             initialRoot
//         )
//     })
//     test("doesn't trigger extraneous side effects", () => {
//         sideEffectStore.update({
//             b: (current) => current,
//             c: (current) => current + "new"
//         })
//         expect(cHandler).toHaveBeenCalled()
//         expect(bing).not.toHaveBeenCalled()
//     })
//     test("handles side effects with function", () => {
//         sideEffectFunctionStore.update({ b: true })
//         expect(functionalHandler).toHaveBeenCalled()
//     })
// })
