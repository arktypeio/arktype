import { Unlisted } from "@re-do/utils"
import { Db } from "./db.js"
import { InputFor } from "./interactions.js"

export const create = <
    Model extends Record<string, any[]>,
    IdKey extends string,
    TypeName extends keyof Model,
    Stored = Unlisted<Model[TypeName]>,
    Input = InputFor<Stored, IdKey>
>(
    db: Db<Model, IdKey>,
    typeName: TypeName,
    data: Input
) => {}

// import { deepEquals, excludeKeys, transform, withDefaults } frosm "@re-do/utils"

// export const create = <T>(
//     data: T,

//     context: FileDbContext<T>,
//     options: CreateOptions<U> = {}
// ) => {
//     const dataToStore = transform(value, ([k, v]) => {
//         if (k === context.idFieldName) {
//             throw new Error(
//                 `The field name '${context.idFieldName}', found on ${typeName}, is not allowed.` +
//                     `If you need to use it, provide a different name for statelessly to use via the 'idFieldName' option.`
//             )
//         }
//         let storedValue = v
//         if (v && typeof v === "object") {
//             let keyName: string
//             const possibleMappedKey = (
//                 context.relationships[typeName] as any
//             )?.[k]
//             if (possibleMappedKey) {
//                 keyName = String(possibleMappedKey)
//             } else {
//                 throw new Error(getUnknownEntityErrorMessage(typeName, k))
//             }
//             storedValue = Array.isArray(v)
//                 ? v.map((_) => create(keyName, _, context)[context.idFieldName])
//                 : create(keyName, v, context)[context.idFieldName]
//         }
//         return [k, storedValue]
//     })
//     const existing = context.store.get(typeName as any) as any[]
//     const reuseExisting = context.reuseExisting[typeName]
//     if (reuseExisting) {
//         let possibleMatch
//         const checkForMatch =
//             typeof reuseExisting === "boolean"
//                 ? deepEquals
//                 : (reuseExisting as CheckForMatch<any>)
//         possibleMatch = existing.find((o) =>
//             checkForMatch(excludeKeys(o, [context.idFieldName]), dataToStore)
//         )
//         if (possibleMatch) {
//             return unpackResult
//                 ? unpack(typeName, possibleMatch, context)
//                 : possibleMatch
//         }
//     }

// const dataToStoreWithId = {
//     ...dataToStore,
//     [context.idFieldName]:
//         existing.reduce(
//             (maxId, currentElement) =>
//                 currentElement[context.idFieldName] > maxId
//                     ? currentElement[context.idFieldName]
//                     : maxId,
//             0
//         ) + 1
// }
//     context.store.update({
//         [typeName]: (_: any[]) => _.concat(dataToStoreWithId)
//     } as any)
//     return unpackResult
//         ? unpack(typeName, dataToStoreWithId, context)
//         : dataToStoreWithId
// }
