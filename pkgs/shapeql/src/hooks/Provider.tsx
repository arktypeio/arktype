import React, { ReactNode, createContext, useContext } from "react"
import { ApolloClient } from "apollo-client"
import { useQuery as useApolloQuery } from "@apollo/react-hooks"
import { LocalShape } from "../shape"
import { Shape as S, Class } from "@re-do/utils"
import { Query, shapeql } from "../shapeql"
import { ShapeFilter } from "../filters"

// @ts-ignore
const ShapeQlContext = createContext<LocalShape>()

export type ShapeQlProviderProps<T extends S> = {
    children: ReactNode
    client: LocalShape<T>
}

export const ShapeQlProvider = <T extends S>({
    children,
    client
}: ShapeQlProviderProps<T>) => (
    <ShapeQlContext.Provider value={client}>{children}</ShapeQlContext.Provider>
)
