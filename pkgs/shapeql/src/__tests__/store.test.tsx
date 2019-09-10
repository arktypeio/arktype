import React from "react"
import gql from "graphql-tag"
import {
    Root,
    initialRoot,
    initialRootWithTypeNames,
    initialA,
    initialAWithTypeNames
} from "./common"
import { Store, Handler, StoreProvider, StoreConsumer } from "../store"
import { getApolloClient } from "../getApolloClient"
import { mount } from "enzyme"

const client = getApolloClient()

const store = new Store({ root: Root, client })

const cHandler = jest.fn()
const bing = jest.fn()
const dHandler = jest.fn()
const handler: Handler<Root> = {
    c: cHandler,
    b: bing,
    d: dHandler
}
const sideEffectStore = new Store({
    root: Root,
    client,
    handler
})

describe("initialization", () => {
    test("doesn't crash", async () => {
        await store.initialize(initialRoot)
    })
})

describe("queries", () => {
    beforeEach(() => {
        client.writeData({ data: initialRootWithTypeNames })
    })
    test("handle shallow", () => {
        expect(store.query({ b: null })).toStrictEqual({ b: false })
    })
    test("handle deep", () => {
        expect(store.query({ a: null })).toStrictEqual({ a: initialA })
    })
    test("handle object arrays", () => {
        expect(store.query({ d: null })).toStrictEqual({
            d: [initialA, initialA]
        })
    })
    test("handle filtered object within array", () => {
        expect(store.query({ d: { a: null } })).toStrictEqual({
            d: [{ a: 0 }, { a: 0 }]
        })
    })
    test("don't include extraneous keys", () => {
        expect(store.query({ a: { a: null } })).toStrictEqual({
            a: { a: initialA.a }
        })
    })
})

describe("mutations", () => {
    beforeEach(() => {
        client.writeData({ data: initialRootWithTypeNames })
    })
    test("handles shallow", async () => {
        await store.mutate({ c: value => value + "suffix" })
        expect(
            client.readQuery({
                query: gql`
                    {
                        c
                    }
                `
            })
        ).toStrictEqual({ c: initialRoot.c + "suffix" })
    })
    test("handles deep", async () => {
        await store.mutate({
            a: { b: { a: value => value.concat([1]) } }
        })
        expect(
            client.readQuery({
                query: gql`
                    {
                        a {
                            b {
                                a
                            }
                        }
                    }
                `
            })
        ).toStrictEqual({
            a: {
                b: {
                    a: initialRoot.a.b.a.concat([1]),
                    __typename: "B"
                },
                __typename: "A"
            }
        })
    })
    test("handles object arrays", async () => {
        await store.mutate({ d: value => value.concat(initialA) })
        expect(
            client.readQuery({
                query: gql`
                    {
                        d {
                            a
                            b {
                                a
                            }
                        }
                    }
                `
            })
        ).toStrictEqual({
            d: [
                initialAWithTypeNames,
                initialAWithTypeNames,
                initialAWithTypeNames
            ]
        })
    })
    test("sets array value", async () => {
        await store.mutate({ d: [] })
        expect(
            client.readQuery({
                query: gql`
                    {
                        d {
                            a
                            b {
                                a
                            }
                        }
                    }
                `
            })
        ).toStrictEqual({
            d: []
        })
    })

    test("doesn't update extraneous keys", async () => {
        const expected = store.queryAll()
        expected.a.b.a = [0, 1]
        await store.mutate({
            a: { b: { a: value => value.concat([1]) } }
        })
        expect(store.queryAll()).toStrictEqual(expected)
    })
    test("handle side effects", async () => {
        await sideEffectStore.mutate({ b: true })
        expect(bing).toBeCalledWith(true)
    })
    test("handles array side effects", async () => {
        await sideEffectStore.mutate({
            d: _ => _.concat(initialA)
        })
        expect(dHandler).toBeCalledWith([initialA, initialA, initialA])
    })
    test("doesn't trigger extraneous side effects", async () => {
        await sideEffectStore.mutate({
            b: current => current,
            c: current => current + "new"
        })
        expect(cHandler).toHaveBeenCalled()
        expect(bing).not.toHaveBeenCalled()
    })
})

describe("StoreContext", () => {
    beforeEach(() => {
        client.writeData({ data: initialRootWithTypeNames })
    })
    it("provides and consumes a store", () => {
        const useStore = jest.fn<any, [Store<any>]>()
        mount(
            <StoreProvider store={store}>
                <StoreConsumer>{useStore}</StoreConsumer>
            </StoreProvider>
        )
        expect(useStore).toBeCalledWith(store)
    })
})

type ResultCheckerProps = {
    passTo: jest.Mock
}

const QueryChecker = ({ passTo }: ResultCheckerProps) =>
    passTo(store.hooks.useQuery({ b: null }))

const checkResult = jest.fn(() => null)

describe("useQuery", () => {
    it("can execute a query", () => {
        mount(
            <StoreProvider store={store}>
                <QueryChecker passTo={checkResult} />
            </StoreProvider>
        )
        expect(checkResult).toBeCalledWith({ b: false })
    })
    it("rerenders on store updates", () => {
        mount(
            <StoreProvider store={store}>
                <QueryChecker passTo={checkResult} />
            </StoreProvider>
        )
        client.writeData({ data: { b: true } })
        expect(checkResult).toBeCalledTimes(2)
        expect(checkResult).toHaveBeenLastCalledWith({ b: true })
    })
})
