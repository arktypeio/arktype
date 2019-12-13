import React, { ReactNode, createContext, useContext, useState } from "react"
import { Provider as ReduxProvider, useSelector } from "react-redux"
import { Update, Query, Store } from "statelessly"

export const createHooks = <T extends any>(store: Store<T>) => ({
    useQuery: <Q extends Query<T>>(q: Q) => {
        useContext(StatelessContext)
        return store.query(q)
    }
})

const StatelessContext = createContext<any>({} as any)

export type StoreProviderProps<T> = {
    children: ReactNode
    store: Store<T>
}

const InnerStatelessProvider = <T extends any>({
    children
}: StoreProviderProps<T>) => {
    const data = useSelector(state => state)
    return (
        <StatelessContext.Provider value={data}>
            {children}
        </StatelessContext.Provider>
    )
}

export const StatelessProvider = <T extends any>({
    children,
    store
}: StoreProviderProps<T>) => {
    return (
        <ReduxProvider store={store.underlying}>
            <InnerStatelessProvider store={store}>
                {children}
            </InnerStatelessProvider>
        </ReduxProvider>
    )
}

export const StatelessConsumer = StatelessContext.Consumer
