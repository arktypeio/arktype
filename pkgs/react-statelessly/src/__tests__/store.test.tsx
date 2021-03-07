import React from "react"
import { Root, initialRoot } from "./common"
import { StatelessProvider, StatelessConsumer, createStore, Store } from ".."
import { mount } from "enzyme"

let store: Store<Root>

describe("StoreContext", () => {
    beforeEach(() => {
        store = createStore({ initial: initialRoot })
    })
    it("provides a store and consumes data", () => {
        let value: Root
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
        store = createStore({ initial: initialRoot })
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
        store.update({ b: true })
        expect(checkResult).toBeCalledTimes(2)
        expect(checkResult).lastCalledWith({ b: true })
    })
})
