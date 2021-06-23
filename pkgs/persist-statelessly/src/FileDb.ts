import { transform, Unlisted } from "@re-do/utils"
import { FileStore, FileStoreOptions } from "./FileStore"

export type Model = Record<string, Record<string, any>[]>

export type MappedKeys<T extends Model> = {
    [K in keyof T]?: { [K2 in keyof Unlisted<T[K]>]?: keyof T }
}

export type FileDb<T extends Model, IdFieldName extends string = "id"> = {
    [K in keyof T]: Interactions<Unlisted<T[K]>, IdFieldName>
}

export type FileDbArgs<
    T extends Model,
    IdFieldName extends string = "id"
> = FileStoreOptions<T> & {
    fallback: T
    mappedKeys?: MappedKeys<T>
    idFieldName?: IdFieldName
}

export const createFileDb = <
    T extends Model,
    IdFieldName extends string = "id"
>({
    fallback,
    mappedKeys = {},
    idFieldName,
    ...rest
}: FileDbArgs<T, IdFieldName extends undefined ? "id" : IdFieldName>): FileDb<
    T,
    IdFieldName extends undefined ? "id" : IdFieldName
> => {
    const store = new FileStore(fallback, {}, rest)
    const context: FileDbContext = {
        fallback,
        store,
        mappedKeys,
        idFieldName: idFieldName ?? "id"
    }
    return transform(fallback, ([k, v]) => [
        k,
        {
            create: (o: any, options?: InteractionOptions<any>) => {
                const { unpack } = addDefaultInteractionOptions(options)
                const result = deepCreate(k, o, context)
                return unpack ? unpackStoredValue(k, result, context) : result
            },
            all: (options?: InteractionOptions<any>) => {
                const { unpack } = addDefaultInteractionOptions(options)
                return find(k, (_) => true, context, {
                    unpack,
                    exactlyOne: false
                })
            },
            find: (by: FindBy<T>, options?: InteractionOptions<any>) => {
                const { unpack } = addDefaultInteractionOptions(options)
                return find(k, by, context, { unpack })
            },
            filter: (by: FindBy<T>, options?: InteractionOptions<any>) => {
                const { unpack } = addDefaultInteractionOptions(options)
                return find(k, by, context, { unpack, exactlyOne: false })
            },
            delete: (by: FindBy<T>, options?: DeleteOptions) => {
                const { prune } = addDefaultDeleteOptions(options)
                // Filter to objects that don't match the find criteria
                const objectsToPreserve = find(k, (o) => !by(o), context, {
                    unpack: false,
                    exactlyOne: false
                }) as object[]
                store.update({ [k]: objectsToPreserve } as any, {
                    actionType: "delete"
                })
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

const addDefaultOptions =
    <T extends object>(defaultOptions: Required<T>) =>
    (providedOptions?: T) => {
        return { ...defaultOptions, ...providedOptions }
    }

const addDefaultInteractionOptions = addDefaultOptions<InteractionOptions<any>>(
    {
        unpack: true
    }
)

const addDefaultDeleteOptions = addDefaultOptions<DeleteOptions>({
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
    fallback: Model
    store: FileStore<any, {}>
    mappedKeys: MappedKeys<any>
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
            const possibleMappedKey = context.mappedKeys[typeName]?.[k]
            if (possibleMappedKey) {
                keyName = String(possibleMappedKey)
            } else if (k in context.fallback) {
                keyName = String(k)
            } else {
                throw new Error(
                    `Unable to determine entity associated with key '${k}' from type '${typeName}'.`
                )
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
        const possibleObjectTypeName = context.mappedKeys[typeName]?.[k]
        if (possibleObjectTypeName) {
            objectTypeName = String(possibleObjectTypeName)
        } else if (k in context.fallback) {
            objectTypeName = String(k)
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
