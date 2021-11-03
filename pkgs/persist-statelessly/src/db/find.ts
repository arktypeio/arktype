import { FindBy, FileDbContext, Model, KeyName } from "./common.js"
import { transform, withDefaults } from "@re-do/utils"

export type FindOptions = {
    unpack?: boolean
    exactlyOne?: boolean
}

const addDefaultFindOptions = withDefaults<FindOptions>({
    unpack: true,
    exactlyOne: true
})

export const find = <T extends Model>(
    typeName: KeyName<T>,
    by: FindBy<any>,
    context: FileDbContext<T>,
    options: FindOptions = {}
) => {
    const { unpack: unpackValues, exactlyOne } = addDefaultFindOptions(options)
    // @ts-ignore
    let objectsToSearch = context.store.get(typeName as any) as object[]
    if (unpackValues) {
        objectsToSearch = objectsToSearch.map((o) =>
            unpack(typeName, o, context)
        )
    }
    if (exactlyOne) {
        const result = objectsToSearch.find(by)
        if (!result) {
            throw new Error(`${typeName} matching criteria ${by} didn't exist.`)
        }
        return result
    } else {
        return objectsToSearch.filter(by)
    }
}

export const unpack = <T extends Model>(
    typeName: KeyName<T>,
    o: Record<string, any>,
    context: FileDbContext<T>,
    seen: { [K in keyof T]?: Record<number, true> } = {}
): any => {
    if (seen[typeName] && o[context.idFieldName] in seen[typeName]) {
        return o[context.idFieldName]
    }
    return transform(o, ([k, v]) => {
        let objectTypeName: string | undefined
        const possibleObjectTypeName = (
            context.relationships[typeName] as any
        )?.[k]
        if (possibleObjectTypeName) {
            objectTypeName = String(possibleObjectTypeName)
        }
        if (objectTypeName) {
            const getUnpackedValue = (id: number) =>
                unpack(
                    objectTypeName!,
                    find(
                        objectTypeName!,
                        (o) => o[context.idFieldName] === id,
                        context,
                        { unpack: false }
                    )!,
                    context,
                    {
                        ...seen,
                        [typeName]: {
                            ...seen[typeName],
                            [o[context.idFieldName]]: true
                        }
                    }
                )
            if (typeof v === "number") {
                return [k, getUnpackedValue(v)]
            } else if (
                Array.isArray(v) &&
                v.every((o) => typeof o === "number")
            ) {
                return [k, v.map((id) => getUnpackedValue(id))]
            }
        }
        return [k, v]
    })
}
