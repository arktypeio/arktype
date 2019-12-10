import { ValueFrom, DeepPartial, isRecursible, fromEntries } from "@re-do/utils"

export type FilterFunction = Parameters<ValueFrom<Array<any>, "filter">>[0]

export type FilterOptions<IsDeep extends boolean = false> = {
    objectFilter?: FilterFunction
    arrayFilter?: FilterFunction
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
    options: FilterOptions<IsDeep>
): ReturnType => {
    if (isRecursible(o)) {
        const { objectFilter, arrayFilter, deep } = options
        const filterFunction = Array.isArray(o) ? arrayFilter : objectFilter
        const shallow = Object.entries(o).filter(
            filterFunction ? filterFunction : () => true
        )
        return fromEntries(
            deep ? shallow.map(([k, v]) => [k, filter(v, options)]) : shallow,
            Array.isArray(o)
        ) as ReturnType
    }
    return (o as any) as ReturnType
}
