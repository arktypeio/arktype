import {
    ExcludeByValue,
    FilterByValue,
    Narrow,
    Exact,
    TypeError,
    NonRecursible
} from "@re-do/utils"

type PrimitiveTypes = {
    string: string
    boolean: boolean
    number: number
    null: null
}

type PrimitivePropDef = keyof PrimitiveTypes

type AtomicPropDef<DefinedTypeName extends string> =
    | DefinedTypeName
    | PrimitivePropDef

type ListPropDef<ListItem extends string = string> = `${ListItem}[]`

type OrPropDef<
    First extends string = string,
    Second extends string = string
> = `${First} | ${Second}`

type PropDefGroup<Group extends string = string> = `(${Group})`

type OptionalPropDef<OptionalType extends string = string> = `${OptionalType}?`

type ValidatedPropDefRecurse<
    DefinedTypeName extends string,
    Fragment extends string
> = Fragment extends PropDefGroup<infer Group>
    ? `(${ValidatedPropDefRecurse<DefinedTypeName, Group>})`
    : Fragment extends ListPropDef<infer ListItem>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, ListItem>}[]`
    : Fragment extends OrPropDef<infer First, infer Second>
    ? `${ValidatedPropDefRecurse<
          DefinedTypeName,
          First
      >} | ${ValidatedPropDefRecurse<DefinedTypeName, Second>}`
    : Fragment extends AtomicPropDef<DefinedTypeName>
    ? Fragment
    : `Unable to determine the type of '${Fragment}'.`

type ValidatedMetaPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = PropDef extends OptionalPropDef<infer OptionalType>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, OptionalType>}?`
    : ValidatedPropDefRecurse<DefinedTypeName, PropDef>

export type ValidatedPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = ValidatedMetaPropDef<DefinedTypeName, PropDef>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
type TypeDefinitionRecurse<DefinedTypeSet, Definition> = {
    [PropName in keyof Definition]: Definition[PropName] extends Exclude<
        NonRecursible | any[],
        string
    >
        ? TypeError<{
              message: `A type definition must be an object whose keys are either strings or nested type definitions.`
              value: Definition[PropName]
          }>
        : Definition[PropName] extends object
        ? Exact<
              Definition[PropName],
              TypeDefinitionRecurse<DefinedTypeSet, Definition[PropName]>
          >
        : ValidatedPropDef<
              keyof DefinedTypeSet & string,
              Definition[PropName] & string
          >
}

export type DefinedTypeSet<Definitions> = TypeDefinitionRecurse<
    Definitions,
    Definitions
>

type ParseTypeString<
    Definitions extends DefinedTypeSet<Definitions>,
    PropDefinition extends string
> = PropDefinition extends OptionalPropDef<infer OptionalType>
    ? ParseTypeStringRecurse<Definitions, OptionalType> | undefined
    : ParseTypeStringRecurse<Definitions, PropDefinition>

type ParseTypeStringRecurse<
    Definitions extends DefinedTypeSet<Definitions>,
    PropDefinition extends string
> = PropDefinition extends PropDefGroup<infer Group>
    ? ParseTypeStringRecurse<Definitions, Group>
    : PropDefinition extends ListPropDef<infer ListItem>
    ? ParseTypeStringRecurse<Definitions, ListItem>[]
    : PropDefinition extends OrPropDef<infer First, infer Second>
    ?
          | ParseTypeStringRecurse<Definitions, First>
          | ParseTypeStringRecurse<Definitions, Second>
    : PropDefinition extends keyof Definitions
    ? ParseType<Definitions, Definitions[PropDefinition]>
    : PropDefinition extends keyof PrimitiveTypes
    ? PrimitiveTypes[PropDefinition]
    : never

export type ParseTypes<Definitions extends DefinedTypeSet<Definitions>> = {
    [TypeName in keyof Definitions]: ParseType<
        Definitions,
        Definitions[TypeName]
    >
}

export type ParseType<
    Definitions extends DefinedTypeSet<Definitions>,
    Definition
> = Definition extends string
    ? ParseTypeString<Definitions, Definition>
    : Definition extends object
    ? ParseTypeObject<Definitions, Definition>
    : TypeError<{
          message: `A type definition must be an object whose keys are either strings or nested type definitions.`
          value: Definition
      }>

type ParseTypeObject<
    Definitions extends DefinedTypeSet<Definitions>,
    Definition
> = {
    [PropName in keyof ExcludeByValue<
        Definition & object,
        OptionalPropDef
    >]: ParseType<Definitions, Definition[PropName]>
} &
    {
        [PropName in keyof FilterByValue<
            Definition & object,
            OptionalPropDef
        >]?: Definition[PropName] extends OptionalPropDef<infer OptionalType>
            ? ParseType<Definitions, OptionalType>
            : never
    }

const getTypes = <Definitions extends DefinedTypeSet<Definitions>>(
    t: Narrow<Definitions>
) => "" as any as ParseTypes<Definitions>

getTypes({
    user: {
        name: "string",
        bestFriend: "user",
        friends: "user[]",
        groups: "group[]",
        nested: {
            another: "string",
            user: "user[]"
        }
    },
    group: {
        name: "string",
        description: "string?",
        members: "user[]",
        owner: "user"
    }
}).group.owner
