import { Exact, NonRecursible, TypeError } from "@re-do/utils"
import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType
} from "./builtin"

type AtomicType<DefinedTypeName extends string> = DefinedTypeName | BuiltInType

type ValidatedPropDefRecurse<
    DefinedTypeName extends string,
    Fragment extends string
> = Fragment extends GroupedType<infer Group>
    ? `(${ValidatedPropDefRecurse<DefinedTypeName, Group>})`
    : Fragment extends ListType<infer ListItem>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, ListItem>}[]`
    : Fragment extends OrType<infer First, infer Second>
    ? `${ValidatedPropDefRecurse<
          DefinedTypeName,
          First
      >} | ${ValidatedPropDefRecurse<DefinedTypeName, Second>}`
    : Fragment extends AtomicType<DefinedTypeName>
    ? Fragment
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

type ValidatedMetaPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = PropDef extends OptionalType<infer OptionalType>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, OptionalType>}?`
    : ValidatedPropDefRecurse<DefinedTypeName, PropDef>

export type ValidatedPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = ValidatedMetaPropDef<DefinedTypeName, PropDef>

export type NonStringOrRecord = Exclude<NonRecursible | any[], string>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
export type ValidatedObjectDef<DefinedTypeName extends string, Definition> = {
    [PropName in keyof Definition]: Definition[PropName] extends NonStringOrRecord
        ? TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
        : Definition[PropName] extends object
        ? Exact<
              Definition[PropName],
              ValidatedObjectDef<DefinedTypeName, Definition[PropName]>
          >
        : ValidatedPropDef<DefinedTypeName, Definition[PropName] & string>
}

export type TypeDefinition<
    DefinedTypeName extends string,
    Definition
> = Definition extends string
    ? ValidatedPropDef<DefinedTypeName, Definition>
    : ValidatedObjectDef<DefinedTypeName, Definition>

export type DefinedTypeSet<Definitions> = ValidatedObjectDef<
    Extract<keyof Definitions, string>,
    Definitions
>
