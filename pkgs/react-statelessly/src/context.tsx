import React, { ReactNode, createContext } from "react"
import { Provider as ReduxProvider, useSelector } from "react-redux"
import { Store } from "./utils"

export const StatelessContext = createContext<any>({} as any)

export type StoreProviderProps<T> = {
    children: ReactNode
    store: Store<T>
}

const InnerStatelessProvider = <T extends any>({
    children
}: StoreProviderProps<T>) => {
    const data = useSelector((state) => state)
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
