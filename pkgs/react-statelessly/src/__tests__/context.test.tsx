import React from "react"
import { act } from "react-dom/test-utils"
import { createStore } from "statelessly"
import { Root, initialRoot, initialA } from "./common"
import { createHooks, StatelessProvider, StatelessConsumer } from "../context"
import { mount } from "enzyme"

let store = createStore({ initial: initialRoot })
let hooks = createHooks(store)

describe("StoreContext", () => {
    beforeEach(() => {
        store = createStore({ initial: initialRoot })
    })
    it("provides a store and consumes data", () => {
        let value: Root
        mount(
            <StatelessProvider store={store}>
                <StatelessConsumer>
                    {data => {
                        value = data
                        return null
                    }}
                </StatelessConsumer>
            </StatelessProvider>
        )
        expect(value).toStrictEqual(store.getContents())
    })
})

type ResultCheckerProps = {
    passTo: jest.Mock
}

const QueryChecker = ({ passTo }: ResultCheckerProps) =>
    passTo(hooks.useQuery({ b: null }))

const checkResult = jest.fn(_ => {
    console.log(_)
})

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
