import React from "react"
import { StatelessProvider, StatelessConsumer, Store } from ".."
import { mount } from "enzyme"

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

const getStore = () => new Store(initialRoot, { enableB: { b: true } })

let store = getStore()

describe("StoreContext", () => {
    beforeEach(() => {
        store = getStore()
    })
    it("provides a store and consumes data", () => {
        let value: Root | undefined
        mount(
            <StatelessProvider store={store}>
                <StatelessConsumer>
                    {(data) => {
                        value = data
                        return null
                    }}
                </StatelessConsumer>
            </StatelessProvider>
        )
        expect(value).toStrictEqual(store.getState())
    })
})

type ResultCheckerProps = {
    passTo: jest.Mock
}

const QueryChecker = ({ passTo }: ResultCheckerProps) =>
    passTo(store.useQuery({ b: true }))

const checkResult = jest.fn((_) => null)

describe("useQuery", () => {
    beforeEach(() => {
        store = getStore()
    })
    it("can execute a query", () => {
        mount(
            <StatelessProvider store={store}>
                <QueryChecker passTo={checkResult} />
            </StatelessProvider>
        )
        expect(checkResult).toBeCalledWith({ b: false })
    })
    it("rerenders on store updates", async () => {
        mount(
            <StatelessProvider store={store}>
                <QueryChecker passTo={checkResult} />
            </StatelessProvider>
        )
        store.$.enableB()
        expect(checkResult).toBeCalledTimes(2)
        expect(checkResult).lastCalledWith({ b: true })
    })
})
