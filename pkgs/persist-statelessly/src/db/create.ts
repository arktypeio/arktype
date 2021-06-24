import { transform, withDefaults } from "@re-do/utils"
import {
    FileDbContext,
    getUnknownEntityErrorMessage,
    Model,
    Shallow,
    KeyName
} from "./common"
import { unpack } from "./find"

export type CreateOptions<Unpack extends boolean> = {
    unpack?: Unpack
}

const addDefaultCreateOptions = withDefaults<CreateOptions<boolean>>({
    unpack: true
})

export const create = <T extends Model, U extends boolean = true>(
    typeName: KeyName<T>,
    value: any,
    context: FileDbContext<T>,
    options: CreateOptions<U> = {}
) => {
    const { unpack: unpackResult } = addDefaultCreateOptions(options)
    const storedData = transform(value, ([k, v]) => {
        if (k === context.idFieldName) {
            throw new Error(
                `The field name '${context.idFieldName}', found on ${typeName}, is not allowed.` +
                    `If you need to use it, provide a different name for statelessly to use via the 'idFieldName' option.`
            )
        }
        let storedValue = v
        if (v && typeof v === "object") {
            let keyName: string
            const possibleMappedKey = (
                context.relationships[typeName] as any
            )?.[k]
            if (possibleMappedKey) {
                keyName = String(possibleMappedKey)
            } else {
                throw new Error(getUnknownEntityErrorMessage(typeName, k))
            }
            storedValue = Array.isArray(v)
                ? v.map((_) => create(keyName, _, context)[context.idFieldName])
                : create(keyName, v, context)[context.idFieldName]
        }
        return [k, storedValue]
    })
    const existing = context.store.get(typeName as any) as Shallow<any, any>[]
    const storedDataWithId = {
        ...storedData,
        [context.idFieldName]:
            existing.reduce(
                (maxId, currentElement) =>
                    currentElement[context.idFieldName] > maxId
                        ? currentElement[context.idFieldName]
                        : maxId,
                0
            ) + 1
    }
    context.store.update({
        [typeName]: (_: any[]) => _.concat(storedDataWithId)
    } as any)
    return unpackResult
        ? unpack(typeName, storedDataWithId, context)
        : storedDataWithId
}
