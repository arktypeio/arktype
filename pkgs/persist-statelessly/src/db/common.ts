import { FileStore } from ".."
import { FilterByValue, Unlisted, withDefaults, Key } from "@re-do/utils"
import { RemoveOptions } from "./remove"

export type FileDbContext<T extends Model> = {
    store: FileStore<T, {}>
    relationships: Relationships<T>
    dependents: Dependents<T>
    idFieldName: string
}

export type KeyName<T extends Model> = string & keyof T

export type Dependents<T extends Model> = {
    [K in keyof T]: { [K in keyof T]?: string[] }
}

export type Data<
    O extends object,
    IdFieldName extends string,
    Unpacked extends boolean
> = Unpacked extends true ? WithIds<O, IdFieldName> : Shallow<O, IdFieldName>

export type FindBy<O extends object> = (o: O) => boolean

export type Shallow<O extends object, IdFieldName extends string> = WithId<
    {
        [K in keyof O]: Unlisted<O[K]> extends object
            ? O[K] extends any[]
                ? number[]
                : number
            : O[K]
    },
    IdFieldName
>

export type WithId<O extends object, IdFieldName extends string> = O &
    Record<IdFieldName extends string ? IdFieldName : never, number>

export type WithIds<O extends object, IdFieldName extends string> = WithId<
    {
        [K in keyof O]: O[K] extends object ? WithIds<O[K], IdFieldName> : O[K]
    },
    IdFieldName
>

export type Model = Record<string, Record<string, any>[]>

export type Relationships<T extends Model> = {
    [K in keyof T]: {
        [K2 in keyof FilterByValue<Unlisted<T[K]>, object>]: keyof T
    }
}

export type InteractionOptions<Unpack extends boolean = true> = {
    unpack?: Unpack
}

export const addDefaultInteractionOptions = withDefaults<
    InteractionOptions<any>
>({
    unpack: true
})

export const getUnknownEntityErrorMessage = (typeName: string, key: Key) =>
    `Unable to determine entity associated with key '${key}' from type '${typeName}'.` +
    `Try adding specifying its type by adding it to the DB's relationships.`
