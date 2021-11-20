import {
    ElementOf,
    Iteration,
    KeyValuate,
    ListPossibleTypes,
    Split
} from "@re-do/utils"
import {
    ControlCharacters,
    Root,
    ValidateTypeRecurseOptions
} from "../components/common.js"
import { ShallowCycleError } from "../components/errors.js"
import { ParseTypeRecurseOptions } from "../parse.js"

type ExtractReferences<
    Def extends string,
    Filter extends string = string
> = RawReferences<Def> & Filter

type RawReferences<
    Fragments extends string,
    RemainingControlCharacters extends string[] = ControlCharacters
> = RemainingControlCharacters extends Iteration<
    string,
    infer Character,
    infer Remaining
>
    ? RawReferences<ElementOf<Split<Fragments, Character>>, Remaining>
    : Exclude<ElementOf<Split<Fragments, RemainingControlCharacters[0]>>, "">

type ExtractReferenceList<
    Def extends string,
    Filter extends string = string
> = ListPossibleTypes<RawReferences<Def> & Filter>

type CheckReferencesForShallowCycle<
    References extends string[],
    TypeSet,
    Seen
> = References extends Iteration<string, infer Current, infer Remaining>
    ? CheckForShallowCycleRecurse<
          KeyValuate<TypeSet, Current>,
          TypeSet,
          Seen | Current
      > extends never
        ? CheckReferencesForShallowCycle<Remaining, TypeSet, Seen>
        : CheckForShallowCycleRecurse<
              KeyValuate<TypeSet, Current>,
              TypeSet,
              Seen | Current
          >
    : never

type CheckForShallowCycleRecurse<Def, TypeSet, Seen> = Def extends Seen
    ? Seen
    : Def extends string
    ? CheckReferencesForShallowCycle<ExtractReferenceList<Def>, TypeSet, Seen>
    : never

type CheckForShallowCycle<Def, TypeSet> = CheckForShallowCycleRecurse<
    Def,
    TypeSet,
    never
>

export namespace TypeSetMember {
    export type Definition<Def extends Root.Definition = Root.Definition> = Def

    export type Validate<
        Def,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = CheckForShallowCycle<Def, TypeSet> extends never
        ? Root.Validate<Def, TypeSet, Options>
        : ShallowCycleError<Def & string, CheckForShallowCycle<Def, TypeSet>>

    export type Parse<
        Def,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Root.Parse<Def, TypeSet, Options>
}
