import React, { ReactNode, createContext } from "react"
import {
    getApolloClient,
    ApolloClientOrOptions,
    ApolloClient
} from "./getApolloClient"
import { DeepPartial, Class } from "@re-do/utils"
import { shapeql, Query } from "./shapeql"
import { Store, StoreArgs } from "./store"

export type Handle<T> = (change: DeepPartial<T>) => Promise<any>
export type Handler<T> = { [P in keyof T]?: Handle<T[P]> }

type ShapeArgs<T, L> = {
    root: Class<T>
    client: ApolloClientOrOptions<T>
    store?: StoreArgs<L>
}

export class Shape<T, L> {
    private root: Class<T>
    private client: ApolloClient
    private _store?: Store<L>

    constructor({ root, client, ...rest }: ShapeArgs<T, L>) {
        this.root = root
        this.client = getApolloClient<T>(client)
        this._store = rest.store
            ? new Store<L>({
                  client: this.client,
                  ...rest.store
              })
            : undefined
    }

    get store() {
        if (!this._store) {
            throw new Error(
                "You must pass a store config when instantiating a ShapeQL Shape to use it with your store."
            )
        }
        return this._store
    }

    async query<Q extends Query<T>>(q: Q) {
        return this.client.query(shapeql(this.root)(q))
    }
}

const ShapeContext = createContext<Shape<any, any>>({} as any)

export type ShapeProviderProps<T, L> = {
    children: ReactNode
    shape: Shape<T, L>
}

export const ShapeProvider = <T, L>({
    children,
    shape
}: ShapeProviderProps<T, L>) => (
    <ShapeContext.Provider value={shape}> {children} </ShapeContext.Provider>
)
