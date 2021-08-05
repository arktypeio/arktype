import { DeepPartial, isRecursible, fromEntries, ValueOf } from "./common.js"

export type FilterFunction<T> = (
    value: T,
    index: number,
    context: T[]
) => boolean

export type FilterOptions<Filterable, IsDeep extends boolean = false> = {
    objectFilter?: FilterFunction<[keyof Filterable, ValueOf<Filterable>]>
    arrayFilter?: FilterFunction<[keyof Filterable, ValueOf<Filterable>]>
    deep?: IsDeep
}

export const filter = <
    ObjectType,
    ReturnType extends IsDeep extends true
        ? DeepPartial<ObjectType>
        : Partial<ObjectType>,
    IsDeep extends boolean = false
>(
    o: ObjectType,
    options: FilterOptions<ObjectType, IsDeep>
): ReturnType => {
    if (isRecursible(o)) {
        const { objectFilter, arrayFilter, deep } = options
        const filterFunction = Array.isArray(o) ? arrayFilter : objectFilter
        const shallow = Object.entries(o).filter(
            filterFunction ? (filterFunction as any) : () => true
        )
        return fromEntries(
            deep ? shallow.map(([k, v]) => [k, filter(v, options)]) : shallow,
            Array.isArray(o)
        ) as ReturnType
    }
    return o as any as ReturnType
}
