import { DeepPartial, NonRecursible, Unlisted, DeepUpdate } from "@re-do/utils"
import type { Store } from "./store.js"
export type { Middleware } from "redux"

export type StoreInput = Record<string, any>

export type UpdateFunction<Input extends StoreInput> = (
    args: any,
    context: Store<Input, any, any>
) => Update<Input> | Promise<Update<Input>>

export type Actions<Input> = Record<
    string,
    Update<Input> | UpdateFunction<Input>
>

export type Query<T> = {
    [P in keyof T]?: Unlisted<T[P]> extends NonRecursible
        ? true
        : Query<Unlisted<T[P]>> | true
}

export type Update<T> = DeepUpdate<T>

export type ActionData<T> = {
    type: string
    payload: DeepPartial<T>
    meta: {
        statelessly: true
        bypassOnChange?: boolean
    }
}

export type StoreActions<A extends Actions<StoreInput>> = {
    [K in keyof A]: A[K] extends (...args: any) => any
        ? (
              ...args: RemoveContextFromArgs<Parameters<A[K]>>
          ) => ReturnType<A[K]> extends Promise<any> ? Promise<void> : void
        : () => void
}

// This allows us to convert from the user provided actions, which can use context to access
// the store in their definitions, to actions as they are attached to the Store, which do not
// require context as a parameter as it is passed internally

type RemoveContextFromArgs<T extends unknown[]> = T extends []
    ? []
    : T extends [infer Current, ...infer Rest]
    ? Current extends Store<any, any, any>
        ? RemoveContextFromArgs<Rest>
        : [Current, ...RemoveContextFromArgs<Rest>]
    : T
