import React from "react"
import { act } from "react-dom/test-utils"
import { Root, initialRoot, initialA } from "./common"
import {
    createStore,
    Handler
    // StoreProvider,
    // StoreConsumer,
    // StoreWithHooks
} from "../store"
import { mount } from "enzyme"

let store = createStore({ initial: initialRoot })

const cHandler = jest.fn()
const bing = jest.fn()
const dHandler = jest.fn()
const handler: Handler<Root> = {
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
        expect(store.get({ b: null })).toStrictEqual({ b: false })
    })
    test("handle deep", () => {
        expect(store.get({ a: null })).toStrictEqual({ a: initialA })
    })
    test("handle object arrays", () => {
        expect(store.get({ d: null })).toStrictEqual({
            d: [initialA, initialA]
        })
    })
    test("handle filtered object within array", () => {
        expect(store.get({ d: { a: null } })).toStrictEqual({
            d: [{ a: 0 }, { a: 0 }]
        })
    })
    test("don't include extraneous keys", () => {
        expect(store.get({ a: { a: null } })).toStrictEqual({
            a: { a: initialA.a }
        })
    })
})

describe("mutations", () => {
    beforeEach(() => {
        store = createStore({ initial: initialRoot })
        sideEffectStore = createStore({ initial: initialRoot, handler })
    })
    test("handles shallow", () => {
        store.update({ c: value => value + "suffix" })
        expect(store.getAll()).toStrictEqual({
            ...initialRoot,
            c: initialRoot.c + "suffix"
        })
    })
    test("handles deep", () => {
        store.update({
            a: { b: { a: value => value.concat([1]) } }
        })
        expect(store.getAll()).toStrictEqual({
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
        store.update({ d: value => value.concat(initialA) })
        expect(store.getAll()).toStrictEqual({
            ...initialRoot,
            d: [initialA, initialA, initialA]
        })
    })
    test("sets array value", async () => {
        store.update({ d: [] })
        expect(store.getAll()).toStrictEqual({
            ...initialRoot,
            d: []
        })
    })

    test("doesn't update extraneous keys", () => {
        store.update({
            a: { b: { a: value => value.concat([1]) } }
        })
        expect(store.getAll()).toStrictEqual({
            ...initialRoot,
            a: { ...initialA, b: { ...initialA.b, a: [0, 1] } }
        })
    })
    test("handle side effects", () => {
        sideEffectStore.update({ b: true })
        expect(bing).toBeCalledWith(true)
    })
    test("handles array side effects", () => {
        sideEffectStore.update({
            d: _ => _.concat(initialA)
        })
        expect(dHandler).toBeCalledWith([initialA, initialA, initialA])
    })
    test("doesn't trigger extraneous side effects", () => {
        sideEffectStore.update({
            b: current => current,
            c: current => current + "new"
        })
        expect(cHandler).toHaveBeenCalled()
        expect(bing).not.toHaveBeenCalled()
    })
})

// describe("StoreContext", () => {
//     beforeEach(() => {
//         client.writeData({ data: initialRootWithTypeNames })
//     })
//     it("provides a store and consumes data", () => {
//         let value: Root
//         mount(
//             <StoreProvider store={store}>
//                 <StoreConsumer>
//                     {data => {
//                         value = data
//                         return null
//                     }}
//                 </StoreConsumer>
//             </StoreProvider>
//         )
//         expect(value).toStrictEqual(store.queryAll())
//     })
// })

// const storeWithHooks = new StoreWithHooks({ root: Root, client })

// type ResultCheckerProps = {
//     passTo: jest.Mock
// }

// const QueryChecker = ({ passTo }: ResultCheckerProps) =>
//     passTo(storeWithHooks.hooks.useQuery({ b: null }))

// const checkResult = jest.fn(() => null)

// describe("useQuery", () => {
//     it("can execute a query", () => {
//         mount(
//             <StoreProvider store={storeWithHooks}>
//                 <QueryChecker passTo={checkResult} />
//             </StoreProvider>
//         )
//         expect(checkResult).toBeCalledWith({ b: false })
//     })
//     it("rerenders on store updates", async () => {
//         mount(
//             <StoreProvider store={storeWithHooks}>
//                 <QueryChecker passTo={checkResult} />
//             </StoreProvider>
//         )
//         await act(async () => await storeWithHooks.mutate({ b: true }))
//         expect(checkResult).toBeCalledTimes(2)
//         expect(checkResult).lastCalledWith({ b: true })
//     })
// })
