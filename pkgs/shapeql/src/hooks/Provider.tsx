import React, { ReactNode, createContext, useContext } from "react"
import { ApolloClient } from "apollo-client"
import { useQuery as useApolloQuery } from "@apollo/react-hooks"
import { Shape } from "../shape"
import { Shape as S, Class } from "@re-do/utils"
import { Query, shapeql } from "../shapeql"
import { ShapeFilter } from "../filters"

// @ts-ignore
const ShapeQlContext = createContext<LocalShape>()

export type ShapeQlProviderProps<T extends S, L extends S> = {
    children: ReactNode
    shape: Shape<T, L>
}

export const ShapeQlProvider = <T extends S, L extends S>({
    children,
    shape
}: ShapeQlProviderProps<T, L>) => (
    <ShapeQlContext.Provider value={shape}>{children}</ShapeQlContext.Provider>
)
