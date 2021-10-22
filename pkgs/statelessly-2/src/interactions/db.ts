import { transform, withDefaults } from "@re-do/utils"

export type TypeNameFrom<Model> = keyof Model & string

export type Db<
    Model extends Record<string, any[]>,
    IdKey extends string = "id",
    TypeName extends TypeNameFrom<Model> = TypeNameFrom<Model>
> = {
    all: <Name extends TypeName>(args: { typeName: Name }) => Model[TypeName][]
    create: <Name extends TypeName>(args: {
        typeName: Name
        data: Omit<Model[Name], IdKey>
    }) => number
    remove: <Name extends TypeName>(args: {
        typeName: Name
        ids: number[]
    }) => void
    update: <Name extends TypeName>(args: {
        typeName: Name
        // Ids to the updated values of the corresponding objects
        changes: Record<number, Omit<Model[Name], IdKey>>
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
    Model extends Record<string, any[]>,
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
            })
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
