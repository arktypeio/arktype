import {
    AsListIfList,
    ExcludeByValue,
    FilterByValue,
    NonRecursible,
    transform,
    Unlisted,
    withDefaults
} from "@re-do/utils"

export type StoredType<IdKey extends string = "id"> = {
    [K in IdKey]: number
} &
    { [K in string]: any }

export type StoredModel<IdKey extends string = "id"> = {
    [K in string]: StoredType<IdKey>[]
}

export type Relationships<
    Model extends StoredModel<IdKey>,
    IdKey extends string = "id"
> = {
    [K in keyof Model]: {
        [K2 in keyof FilterByValue<
            Unlisted<Model[K]>,
            StoredType<IdKey>
        >]: keyof Model
    }
}

export type ShallowStoredType<
    Stored extends StoredType<IdKey>,
    IdKey extends string = "id"
> = {
    [K in keyof Stored]: Unlisted<Stored[K]> extends StoredType<IdKey>
        ? AsListIfList<number, Stored[K]>
        : Stored[K]
}

export type ShallowInput<
    Model extends StoredModel<IdKey>,
    TypeName extends keyof Model,
    IdKey extends string = "id"
> = Omit<ShallowStoredType<Unlisted<Model[TypeName]>, IdKey>, IdKey>

export type Input<
    Model extends StoredModel<IdKey>,
    Name extends keyof Model,
    IdKey extends string = "id"
> = Omit<Unlisted<Model[Name]>, IdKey>

export type Db<
    Model extends StoredModel<IdKey>,
    IdKey extends string = "id"
> = {
    all: <Name extends keyof Model>(args: {
        typeName: Name
    }) => Model[keyof Model]
    create: <Name extends keyof Model>(args: {
        typeName: Name
        data: ShallowInput<Model, Name, IdKey>
    }) => number
    remove: <Name extends keyof Model>(args: {
        typeName: Name
        ids: number[]
    }) => void
    update: <Name extends keyof Model>(args: {
        typeName: Name
        // Ids to the updated values of the corresponding objects
        changes: Record<number, ShallowInput<Model, Name, IdKey>>
    }) => void
}

export type InMemoryDbOptions<IdKey extends string> = {
    idKey?: IdKey
}

export const getNextId = <IdKey extends string>(
    existing: {
        [K in IdKey]: number
    }[],
    idKey: IdKey
) => {
    const existingIds = transform(existing, ([i, v]) => [v[idKey], true], {
        asArray: "never"
    })
    let nextId = 1
    while (nextId in existingIds) {
        nextId++
    }
    return nextId
}

export const createMemoryDb = <
    Model extends StoredModel<IdKey>,
    IdKey extends string = "id"
>(
    initial: Model,
    options?: InMemoryDbOptions<IdKey>
): Db<Model, IdKey> => {
    const db = initial
    const { idKey } = withDefaults({ idKey: "id" })(options)
    return {
        all: ({ typeName }) => db[typeName],
        create: ({ typeName, data }) => {
            const existing = db[typeName]
            const nextId = getNextId(existing, idKey)
            db[typeName].push({
                ...data,
                [idKey]: nextId
            } as any)
            return nextId
        },
        remove: ({ typeName, ids }) => {
            db[typeName] = db[typeName].filter(
                (value) => !ids.includes(value[idKey])
            ) as any
        },
        update: ({ typeName, changes }) => {
            db[typeName].map((value) => {
                const id = value[idKey]
                return id in changes ? { ...changes[id], [idKey]: id } : value
            })
        }
    }
}
