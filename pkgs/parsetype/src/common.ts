export type BuiltInTypeMap = {
    string: string
    boolean: boolean
    number: number
    null: null
    undefined: undefined
    unknown: unknown
    any: any
    true: true
    false: false
    object: object
    void: void
    symbol: symbol
    never: never
}

export type BuiltInType = keyof BuiltInTypeMap

export type ListType<ListItem extends string = string> = `${ListItem}[]`

export type OrType<
    First extends string = string,
    Second extends string = string
> = `${First}|${Second}`

export type GroupedType<Group extends string = string> = `(${Group})`

export type OptionalType<OptionalType extends string = string> =
    `${OptionalType}?`
