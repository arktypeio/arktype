import { AsListIfList, transform, withDefaults } from "@re-do/utils"

export type Entity<IdKey extends string = "id"> = {
    [K in IdKey]: number
} & { [K in string]: any }

export type DbContents<IdKey extends string = "id"> = {
    [K in string]: Entity<IdKey>
}

export type ShallowStoredType<
    Stored extends Entity<IdKey>,
    IdKey extends string = "id"
> = {
    [K in keyof Stored]: Stored[K] extends Entity<IdKey>
        ? AsListIfList<number, Stored[K]>
        : Stored[K]
}

export type InputTypes<
    Types extends DbContents<IdKey>,
    IdKey extends string = "id"
> = {
    [TypeName in keyof Types]: Omit<
        ShallowStoredType<Types[TypeName], IdKey>,
        IdKey
    >
}

export type Db<
    Types extends DbContents<IdKey>,
    IdKey extends string = "id",
    Inputs extends InputTypes<Types, IdKey> = InputTypes<Types, IdKey>
> = {
    all: <Name extends keyof Types>(args: {
        typeName: Name
    }) => Types[keyof Types][]
    create: <Name extends keyof Types>(args: {
        typeName: Name
        data: Inputs[Name]
    }) => number
    remove: <Name extends keyof Types>(args: {
        typeName: Name
        ids: number[]
    }) => void
    update: <Name extends keyof Types>(args: {
        typeName: Name
        // Ids to the updated values of the corresponding objects
        changes: Record<number, Inputs[Name]>
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

export type ModelValue<Model> = {
    [TypeName in keyof Model]: Model[TypeName][]
}

export const createMemoryDb = <
    Model extends DbContents<IdKey>,
    IdKey extends string = "id"
>(
    initial: ModelValue<Model>,
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
