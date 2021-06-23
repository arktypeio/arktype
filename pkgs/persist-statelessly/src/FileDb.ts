import {
    transform,
    Unlisted,
    FilterByValue,
    withDefaults,
    Key,
    split,
    isEmpty
} from "@re-do/utils"
import { FileStore, FileStoreOptions } from "./FileStore"

export type Model = Record<string, Record<string, any>[]>

export type Relationships<T extends Model> = {
    [K in keyof T]: {
        [K2 in keyof FilterByValue<Unlisted<T[K]>, object>]: keyof T
    }
}

export type FileDb<T extends Model, IdFieldName extends string = "id"> = {
    [K in keyof T]: Interactions<Unlisted<T[K]>, IdFieldName>
}

export type FileDbArgs<
    T extends Model,
    IdFieldName extends string = "id"
> = FileStoreOptions<T> & {
    relationships: Relationships<T>
    idFieldName?: IdFieldName
}

export const createFileDb = <
    T extends Model,
    IdFieldName extends string = "id"
>({
    relationships,
    idFieldName,
    ...fileStoreOptions
}: FileDbArgs<T, IdFieldName extends undefined ? "id" : IdFieldName>): FileDb<
    T,
    IdFieldName extends undefined ? "id" : IdFieldName
> => {
    const store = new FileStore<T>({}, fileStoreOptions)
    const context: FileDbContext = {
        store,
        relationships,
        idFieldName: idFieldName ?? "id"
    }
    const dependents = transform(relationships, ([k, v]) => [
        k,
        Object.entries(relationships).reduce(
            (dependentsOfK, [candidateKey, candidateRelationships]) => {
                const kTypedFields = Object.entries(candidateRelationships)
                    .filter(
                        ([candidateField, candidateFieldType]) =>
                            candidateFieldType === k
                    )
                    .map(
                        ([candidateField, candidateFieldType]) => candidateField
                    )
                if (!isEmpty(kTypedFields)) {
                    return {
                        ...dependentsOfK,
                        [candidateKey]: kTypedFields
                    }
                }
                return dependentsOfK
            },
            {}
        )
    ]) as any as { [K in keyof T]: { [K in keyof T]?: string[] } }
    return transform(relationships, ([k, v]: [string, any]) => [
        k,
        {
            create: (o: any, options: InteractionOptions<any> = {}) => {
                const { unpack } = addDefaultInteractionOptions(options)
                const result = deepCreate(k, o, context)
                return unpack ? unpackStoredValue(k, result, context) : result
            },
            all: (options: InteractionOptions<any> = {}) => {
                const { unpack } = addDefaultInteractionOptions(options)
                return find(k, (_) => true, context, {
                    unpack,
                    exactlyOne: false
                })
            },
            find: (by: FindBy<T>, options: InteractionOptions<any> = {}) => {
                const { unpack } = addDefaultInteractionOptions(options)
                return find(k, by, context, { unpack })
            },
            filter: (by: FindBy<T>, options: InteractionOptions<any> = {}) => {
                const { unpack } = addDefaultInteractionOptions(options)
                return find(k, by, context, { unpack, exactlyOne: false })
            },
            delete: (by: FindBy<T>, options: DeleteOptions = {}) => {
                const { prune } = addDefaultDeleteOptions(options)
                const [objectsToDelete, objectsToPreserve] = split<T>(
                    store.get(k as any) as T[],
                    by
                )
                const idsToDelete = objectsToDelete.map(
                    (o) => o.id
                ) as any as number[]
                const cascadedUpdates = {} as any
                Object.entries(dependents[k]).forEach(
                    ([dependentType, dependentFields]) => {
                        const possibleDependentValues = store.get(
                            dependentType as any
                        ) as any[]
                        possibleDependentValues.forEach(
                            (possibleDependentValue) => {
                                dependentFields?.forEach((fieldName) => {
                                    const idsOfK =
                                        possibleDependentValue?.[fieldName]
                                    if (idsOfK) {
                                        if (Array.isArray(idsOfK)) {
                                            const preservedIdsOfK =
                                                idsOfK.filter(
                                                    (id) =>
                                                        !idsToDelete.includes(
                                                            id
                                                        )
                                                )
                                            if (
                                                preservedIdsOfK.length <
                                                idsOfK.length
                                            ) {
                                                cascadedUpdates[dependentType] =
                                                    {
                                                        ...cascadedUpdates[
                                                            dependentType
                                                        ],
                                                        [fieldName]:
                                                            preservedIdsOfK
                                                    }
                                            }
                                        } else if (typeof idsOfK === "number") {
                                            if (idsToDelete.includes(idsOfK)) {
                                                cascadedUpdates[dependentType] =
                                                    {
                                                        ...cascadedUpdates[
                                                            dependentType
                                                        ],
                                                        [fieldName]: null
                                                    }
                                            }
                                        } else {
                                            throw new Error(
                                                `Expected an ID or list of IDs for ${dependentType}/${fieldName} but instead found ${idsOfK}.`
                                            )
                                        }
                                    }
                                })
                            }
                        )
                    }
                )
                // TODO: Fix types that reference themselves
                store.update(
                    { [k]: objectsToPreserve, ...cascadedUpdates },
                    {
                        actionType: "delete"
                    }
                )
            }
        }
    ]) as any
}

type FindBy<O extends object> = (o: O) => boolean

type Shallow<O extends object, IdFieldName extends string> = WithId<
    {
        [K in keyof O]: O[K] extends object ? number : O[K]
    },
    IdFieldName
>

type WithId<O extends object, IdFieldName extends string> = O &
    Record<IdFieldName extends string ? IdFieldName : never, number>

type WithIds<O extends object, IdFieldName extends string> = WithId<
    {
        [K in keyof O]: O[K] extends object ? WithIds<O[K], IdFieldName> : O[K]
    },
    IdFieldName
>

type InteractionOptions<Unpack extends boolean = true> = {
    unpack?: Unpack
}

type DeleteOptions = {
    prune?: boolean
}

const addDefaultInteractionOptions = withDefaults<InteractionOptions<any>>({
    unpack: true
})

const addDefaultDeleteOptions = withDefaults<DeleteOptions>({
    prune: true
})

type Data<
    O extends object,
    IdFieldName extends string,
    Unpacked extends boolean
> = Unpacked extends true ? WithIds<O, IdFieldName> : Shallow<O, IdFieldName>

type Interactions<O extends object, IdFieldName extends string> = {
    create: <U extends boolean = true>(
        o: O,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    all: <U extends boolean = true>(
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    find: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    filter: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    delete: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: DeleteOptions
    ) => void
}

type FileDbContext = {
    store: FileStore<any, {}>
    relationships: Relationships<any>
    idFieldName: string
}

const deepCreate = (typeName: string, value: any, context: FileDbContext) => {
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
            const possibleMappedKey = context.relationships[typeName]?.[k]
            if (possibleMappedKey) {
                keyName = String(possibleMappedKey)
            } else {
                throw new Error(getUnknownEntityErrorMessage(typeName, k))
            }
            storedValue = Array.isArray(v)
                ? v.map(
                      (_) =>
                          deepCreate(keyName, _, context)[context.idFieldName]
                  )
                : deepCreate(keyName, v, context)[context.idFieldName]
        }
        return [k, storedValue]
    })
    const existing = context.store.get(typeName) as Shallow<any, any>[]
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
    return storedDataWithId
}

type FindOptions = {
    unpack?: boolean
    exactlyOne?: boolean
}

const getUnknownEntityErrorMessage = (typeName: string, key: Key) =>
    `Unable to determine entity associated with key '${key}' from type '${typeName}'.` +
    `Try adding specifying its type by adding it to the DB's relationships.`

const find = (
    typeName: string,
    by: FindBy<any>,
    context: FileDbContext,
    { exactlyOne = true, unpack = true }: FindOptions = {}
) => {
    let objectsToSearch = context.store.get(typeName) as object[]
    if (unpack) {
        objectsToSearch = objectsToSearch.map((o) =>
            unpackStoredValue(typeName, o, context)
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

const unpackStoredValue = (
    typeName: string,
    o: Record<string, any>,
    context: FileDbContext
): any => {
    return transform(o, ([k, v]) => {
        let objectTypeName: string | undefined
        const possibleObjectTypeName = context.relationships[typeName]?.[k]
        if (possibleObjectTypeName) {
            objectTypeName = String(possibleObjectTypeName)
        }
        if (objectTypeName) {
            const getUnpackedValue = (id: number) =>
                unpackStoredValue(
                    objectTypeName!,
                    find(
                        objectTypeName!,
                        (o) => o[context.idFieldName] === id,
                        context,
                        { unpack: false }
                    )!,
                    context
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
