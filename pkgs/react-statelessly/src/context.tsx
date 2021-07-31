import React, { ReactNode, createContext } from "react"
import { Provider as ReduxProvider, useSelector } from "react-redux"
import { Actions } from "statelessly"
import type { Store } from "./store.js"

export const StatelessContext = createContext<any>({} as any)

export type StoreProviderProps<T extends object, A extends Actions<T>> = {
    children: ReactNode
    store: Store<T, A>
}

const InnerStatelessProvider = <T extends object, A extends Actions<T>>({
    children
}: StoreProviderProps<T, A>) => {
    const data = useSelector((state) => state)
    return (
        <StatelessContext.Provider value={data}>
            {children}
        </StatelessContext.Provider>
    )
}

export const StatelessProvider = <T extends object, A extends Actions<T>>({
    children,
    store
}: StoreProviderProps<T, A>) => {
    return (
        <ReduxProvider store={store.underlying}>
            <InnerStatelessProvider store={store as any}>
                {children}
            </InnerStatelessProvider>
        </ReduxProvider>
    )
}

export const StatelessConsumer = StatelessContext.Consumer
