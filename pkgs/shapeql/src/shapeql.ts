import gql from "graphql-tag"
import { NonRecursible, Shape as S, Class, Unlisted } from "@re-do/utils"
import { shapeFilter, DeepUpdate } from "./filters"
import { metamorph } from "./filters/metamorph"

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

export type Query<T extends S> = DeepNull<RootQuery<T>>

export type ShapedQuery<T extends S> = DeepNullShapeOf<RootQuery<T>>

export type Initialization<T extends S> = DeepShapeOf<T>

// Flexible mutation object that allows either values or functions mapping updates
export type Mutation<T extends S> = DeepUpdate<T>

export type ShapedMutation<T extends S> = Partial<Initialization<T>>

export const shapeql = <T extends S, Q extends Query<T>>(root: Class<T>) => (
    query: Q
) => toGql(shapeQuery(root)(query))

export const toGql = <T extends S>(query: ShapedQuery<T>) =>
    gql(
        JSON.stringify(query, null, 4)
            .replace(/"/g, "")
            .replace(/:/g, "")
            .replace(/null/g, "")
    )

export type RootQueryOptions<T extends S> = {
    rootClass: Class<T>
}

export const rootQuery = <T extends S>(rootClass: Class<T>) =>
    metamorph(new rootClass(), rootClass, {
        objectMorph: (obj, metadata) => {
            if (metadata) {
                try {
                    return new (metadata.target as any)()
                } catch {
                    return null
                }
            }
            return null
        },
        iterateArrays: false
    }) as RootQuery<T>

export const withTypeNames = <T extends S>(
    sourceObject: T,
    classWithMetadata: Class<T>
) => {
    return metamorph(sourceObject, classWithMetadata, {
        objectMorph: (obj, metadata) =>
            metadata
                ? {
                      ...obj,
                      __typename: metadata.name
                  }
                : obj
    }) as T
}

const shapeQuery = <T extends S, Q extends Query<T>>(rootClass: Class<T>) => (
    query: Q
) => (shapeFilter(rootQuery(rootClass), query) as any) as ShapedQuery<T>
