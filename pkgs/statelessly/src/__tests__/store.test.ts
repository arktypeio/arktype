import { Root, initialRoot, initialA } from "./common"
import { createStore, Handler } from "../store"

let store = createStore({ initial: initialRoot })

const cHandler = jest.fn()
const bing = jest.fn()
const dHandler = jest.fn()
const handler: Handler<Root, Root> = {
    c: cHandler,
    b: bing,
    d: dHandler
}
let sideEffectStore = createStore({
    initial: initialRoot,
    handler
})

describe("queries", () => {
    beforeEach(() => {
        store = createStore({ initial: initialRoot })
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

describe("updates", () => {
    beforeEach(() => {
        store = createStore({ initial: initialRoot })
        sideEffectStore = createStore({ initial: initialRoot, handler })
    })
    test("handles shallow", () => {
        store.mutate({ c: value => value + "suffix" })
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            c: initialRoot.c + "suffix"
        })
    })
    test("handles deep", () => {
        store.mutate({
            a: { b: { a: value => value.concat([1]) } }
        })
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
    test("handles object arrays", () => {
        store.mutate({ d: value => value.concat(initialA) })
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            d: [initialA, initialA, initialA]
        })
    })
    test("sets array value", async () => {
        store.mutate({ d: [] })
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            d: []
        })
    })

    test("doesn't update extraneous keys", () => {
        store.mutate({
            a: { b: { a: value => value.concat([1]) } }
        })
        expect(store.getState()).toStrictEqual({
            ...initialRoot,
            a: { ...initialA, b: { ...initialA.b, a: [0, 1] } }
        })
    })
    test("handle side effects", () => {
        sideEffectStore.mutate({ b: true })
        expect(bing).toBeCalledWith(true, initialRoot)
    })
    test("handles array side effects", () => {
        sideEffectStore.mutate({
            d: _ => _.concat(initialA)
        })
        expect(dHandler).toBeCalledWith(
            [initialA, initialA, initialA],
            initialRoot
        )
    })
    test("doesn't trigger extraneous side effects", () => {
        sideEffectStore.mutate({
            b: current => current,
            c: current => current + "new"
        })
        expect(cHandler).toHaveBeenCalled()
        expect(bing).not.toHaveBeenCalled()
    })
})
