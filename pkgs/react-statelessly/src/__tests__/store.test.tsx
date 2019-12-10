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

describe("StoreContext", () => {
    beforeEach(() => {
        client.writeData({ data: initialRootWithTypeNames })
    })
    it("provides a store and consumes data", () => {
        let value: Root
        mount(
            <StoreProvider store={store}>
                <StoreConsumer>
                    {data => {
                        value = data
                        return null
                    }}
                </StoreConsumer>
            </StoreProvider>
        )
        expect(value).toStrictEqual(store.queryAll())
    })
})

const storeWithHooks = new StoreWithHooks({ root: Root, client })

type ResultCheckerProps = {
    passTo: jest.Mock
}

const QueryChecker = ({ passTo }: ResultCheckerProps) =>
    passTo(storeWithHooks.hooks.useQuery({ b: null }))

const checkResult = jest.fn(() => null)

describe("useQuery", () => {
    it("can execute a query", () => {
        mount(
            <StoreProvider store={storeWithHooks}>
                <QueryChecker passTo={checkResult} />
            </StoreProvider>
        )
        expect(checkResult).toBeCalledWith({ b: false })
    })
    it("rerenders on store updates", async () => {
        mount(
            <StoreProvider store={storeWithHooks}>
                <QueryChecker passTo={checkResult} />
            </StoreProvider>
        )
        await act(async () => await storeWithHooks.mutate({ b: true }))
        expect(checkResult).toBeCalledTimes(2)
        expect(checkResult).lastCalledWith({ b: true })
    })
})
