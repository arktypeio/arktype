// import React, { ReactNode, createContext } from "react"
// import { ApolloQueryResult } from "apollo-boost"
// import {
//     useQuery as useApolloQuery,
//     QueryHookOptions as ApolloQueryHookOptions
// } from "@apollo/react-hooks"
// import { Class } from "@re-do/utils"
// import { shapeql, Query } from "./unstately"
// import { Store, StoreArgs } from "./store"
// import { excludeKeys, ShapeFilter } from "./filters"

// type ShapeArgs<T, L> = {
//     root: T
//     store?: StoreArgs<L>
// }

// export class Shape<T, L> {
//     private root: Class<T>
//     private client: ApolloClient
//     private _store?: Store<L>

//     constructor({ root, client, ...rest }: ShapeArgs<T, L>) {
//         this.root = root
//         this.client = getApolloClient<T>(client)
//         this._store = rest.store
//             ? new Store<L>({
//                   client: this.client,
//                   ...rest.store
//               })
//             : undefined
//     }

//     get store() {
//         if (!this._store) {
//             throw new Error(
//                 "You must pass a store config when instantiating a ShapeQL Shape to use it with your store."
//             )
//         }
//         return this._store
//     }

//     async query<Q extends Query<T>>(q: Q) {
//         return this.client.query(shapeql(this.root)(q))
//     }
// }

// const ShapeContext = createContext<Shape<any, any>>({} as any)

// export type ShapeProviderProps<T, L> = {
//     children: ReactNode
//     shape: Shape<T, L>
// }

// export const ShapeProvider = <T, L>({
//     children,
//     shape
// }: ShapeProviderProps<T, L>) => (
//     <ShapeContext.Provider value={shape}> {children} </ShapeContext.Provider>
// )

// export class ShapeWithHooks<T> extends Store<T> {
//     hooks = {
//         useQuery: <Q extends Query<T>, R extends ShapeFilter<T, Q>>(
//             q: Q,
//             options?: ApolloQueryHookOptions<R>
//         ) => {
//             const result = useApolloQuery<R>(shapeql(this.root)(q), options)
//             if (result.data) {
//                 result.data = (excludeKeys(
//                     result.data,
//                     ["__typename"],
//                     true
//                 ) as any) as R
//             }
//             return (result as any) as ApolloQueryResult<R>
//         }
//     }
// }
