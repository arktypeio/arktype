import { NonRecursible, Unlisted } from "@re-do/utils"
import { DeepUpdate } from "./filters"

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

// More flexible gqlesque query type that will retrieve all keys nulled object types
export type DeepNull<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? null : DeepNull<T[P]> | null
}

// Represents a gql query that will retrieve all nested fields
export type Query<T> = {
    [P in keyof T]?: Unlisted<T[P]> extends NonRecursible
    ? null
    : Query<Unlisted<T[P]>> | null
}

export type Update<T> = DeepUpdate<T>
