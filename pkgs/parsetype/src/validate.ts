import { Exact, NonRecursible, TypeError } from "@re-do/utils"
import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType
} from "./builtin"

type AtomicStringDefinition<DeclaredName extends string> =
    | DeclaredName
    | BuiltInType

type StringDefinitionRecurse<
    Fragment extends string,
    DeclaredName extends string
> = Fragment extends GroupedType<infer Group>
    ? `(${StringDefinitionRecurse<DeclaredName, Group>})`
    : Fragment extends ListType<infer ListItem>
    ? `${StringDefinitionRecurse<DeclaredName, ListItem>}[]`
    : Fragment extends OrType<infer First, infer Second>
    ? `${StringDefinitionRecurse<
          DeclaredName,
          First
      >} | ${StringDefinitionRecurse<DeclaredName, Second>}`
    : Fragment extends AtomicStringDefinition<DeclaredName>
    ? Fragment
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

type StringDefinition<
    Definition extends string,
    DeclaredName extends string
> = Definition extends OptionalType<infer OptionalType>
    ? `${StringDefinitionRecurse<DeclaredName, OptionalType>}?`
    : StringDefinitionRecurse<DeclaredName, Definition>

type NonStringOrRecord = Exclude<NonRecursible | any[], string>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
type ObjectDefinition<Definition, DeclaredName extends string> = {
    [PropName in keyof Definition]: Definition[PropName] extends NonStringOrRecord
        ? TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
        : Definition[PropName] extends object
        ? Exact<
              Definition[PropName],
              ObjectDefinition<Definition[PropName], DeclaredName>
          >
        : StringDefinition<Definition[PropName] & string, DeclaredName>
}

export type TypeDefinition<
    Definition,
    DeclaredName extends string = never
> = Definition extends string
    ? StringDefinition<Definition, DeclaredName>
    : ObjectDefinition<Definition, DeclaredName>

export type DiscreteTypeSet<TypeSet extends object> = ObjectDefinition<
    TypeSet,
    Extract<keyof TypeSet, string>
>
