import {
    DeepPartial,
    NonRecursible,
    Unlisted,
    DeepUpdate,
    LimitDepth
} from "@re-do/utils"
export type { Middleware } from "redux"

type Store<A, B, C> = any

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

export type Interactions<O extends object, IdKey extends string> = {
    create: <U extends boolean = true>(o: O) => Data<O, IdKey, U>
    all: <U extends boolean = true>() => Data<O, IdKey, U>[]
    find: <U extends boolean = true>(
        by: FindBy<Data<O, IdKey, U>>
    ) => Data<O, IdKey, U>
    filter: <U extends boolean = true>(
        by: FindBy<Data<O, IdKey, U>>
    ) => Data<O, IdKey, U>[]
    remove: <U extends boolean = true>(by: FindBy<Data<O, IdKey, U>>) => void
    update: (
        by: FindBy<Data<O, IdKey, false>>,
        update: DeepUpdate<Data<O, IdKey, false>>
    ) => void
}

export type Data<
    O extends object,
    IdFieldName extends string,
    Unpacked extends boolean
> = Unpacked extends true
    ? WithIds<O, IdFieldName>
    : ShallowWithId<O, IdFieldName>

export type FindBy<O extends object> = (o: O) => boolean

export type Shallow<O> = LimitDepth<O, 1, number>

export type ShallowWithId<
    O extends object,
    IdFieldName extends string
> = WithId<Shallow<O>, IdFieldName>

export type WithId<O extends object, IdFieldName extends string> = O &
    Record<IdFieldName extends string ? IdFieldName : never, number>

export type WithIds<O extends object, IdFieldName extends string> = WithId<
    {
        [K in keyof O]: O[K] extends object ? WithIds<O[K], IdFieldName> : O[K]
    },
    IdFieldName
>
