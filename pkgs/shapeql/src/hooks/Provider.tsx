import React, { ReactNode, createContext, useContext } from "react"
import { useQuery as useApolloQuery } from "@apollo/react-hooks"
import { ShapeQl } from "../client"
import { Shape as S } from "@re-do/utils"
import { Query } from "../shapeql"

// @ts-ignore
const ShapeQlContext = createContext<ShapeQl>()

export type ShapeQlProviderProps<T extends S> = {
    children: ReactNode
    client: ShapeQl<T>
}

export const ShapeQlProvider = <T extends S>({
    children,
    client
}: ShapeQlProviderProps<T>) => (
    <ShapeQlContext.Provider value={client}>{children}</ShapeQlContext.Provider>
)

export class ShapeQlHooks<T extends S> extends ShapeQl<T> {
    useQuery(query: Query<T>) {}
}
