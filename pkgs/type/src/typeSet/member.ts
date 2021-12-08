import { Iteration, KeyValuate } from "@re-do/utils"
import { ValidateTypeRecurseOptions } from "../components/common.js"
import { ShallowCycleError } from "../components/errors.js"
import { Root } from "../components/root.js"
import { ParseTypeRecurseOptions } from "../parse.js"
import { References } from "../references.js"

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
    ? CheckReferencesForShallowCycle<
          References<Def, { asList: true }>,
          TypeSet,
          Seen
      >
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
