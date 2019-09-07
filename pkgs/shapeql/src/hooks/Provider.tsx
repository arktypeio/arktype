import React, { ReactNode, createContext, useContext } from "react"
import { ApolloClient } from "apollo-client"
import { ShapeQlContextValue } from "../store"

// @ts-ignore
const ShapeQlContext = createContext<ShapeQlContextValue>()

export const ShapeQlProvider = <T extends any>({
    children,
    client
}: ShapeQlProviderProps<T>) => (
    <ShapeQlContext.Provider
        value={{
            client:
                client instanceof ApolloClient ? client : createClient(client)
        }}
    >
        {children}
    </ShapeQlContext.Provider>
)

const useQuery = () => {
    const { client } = useContext(ShapeQlContext)
    if (!client) {
        throw new Error("Can't use ShapeQL hooks outside of a ShapeQlProvider.")
    }
}
