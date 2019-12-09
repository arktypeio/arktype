import gql from "graphql-tag"
import { NonRecursible, Unlisted, fromEntries, isRecursible } from "@re-do/utils"
import { shapeFilter, DeepUpdate } from "./filters"

// Mirrors the shape of a gql query by using nulls to represent values to retrieve
export type DeepNullShapeOf<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? null : DeepNullShapeOf<T[P]>
}

export type ExcludeByValue<T, V> = Pick<
    T,
    { [K in keyof T]: T[K] extends V ? never : K }[keyof T]
>

export type DeepNonNullableObjects<T> = {
    [P in keyof ExcludeByValue<T, NonRecursible>]-?: P extends keyof T
    ? NonNullable<DeepNonNullableObjects<T[P]>>
    : never
}

// Mirrors the shape of a cache write by deeply disallowing null/undefined objects
export type DeepShapeOf<T> = T & DeepNonNullableObjects<T>

// More flexible gqlesque query type that will retrieve all keys nulled object types
export type DeepNull<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? null : DeepNull<T[P]> | null
}

// Represents a gql query that will retrieve all nested fields
export type RootQuery<T> = {
    [P in keyof T]-?: Unlisted<T[P]> extends NonRecursible
    ? null
    : RootQuery<Unlisted<T[P]>>
}

export type Query<T> = DeepNull<RootQuery<T>>

export type ShapedQuery<T> = DeepNullShapeOf<RootQuery<T>>

export type Initialization<T> = DeepShapeOf<T>

// Flexible mutation object that allows either values or functions mapping updates
export type Mutation<T> = DeepUpdate<T>

export type ShapedMutation<T> = Partial<Initialization<T>>

export const shapeql = <T, Q extends Query<T>>(root: T) => (query: Q) =>
    toGql(shapeQuery(root)(query))

export const toGql = <T>(query: ShapedQuery<T>) =>
    gql(
        JSON.stringify(query, null, 4)
            .replace(/"/g, "")
            .replace(/:/g, "")
            .replace(/null/g, "")
    )


export const rootQuery = <T>(root: T) => {
    fromEntries(Object.entries(root).map(([k, v]) => {
        if (Array.isArray(v)) {
            return [k, rootQuery(v[0])]
        }
        if (isRecursible(v)) {
            return [k, rootQuery(v)]
        }
        return [k, true]
    })) as RootQuery<T>
}

const shapeQuery = <T, Q extends Query<T>>(root: T) => (query: Q) =>
    (shapeFilter(rootQuery(root), query) as any) as ShapedQuery<T>
