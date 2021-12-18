import { IsAny, Iteration, KeyValuate } from "@re-/utils"
import { ParseConfig, ShallowCycleError } from "./internal.js"
import { Root, Str } from "../definition"

type CheckReferencesForShallowCycle<
    References extends string[],
    Typespace,
    Seen
> = References extends Iteration<string, infer Current, infer Remaining>
    ? CheckForShallowCycleRecurse<
          KeyValuate<Typespace, Current>,
          Typespace,
          Seen | Current
      > extends never
        ? CheckReferencesForShallowCycle<Remaining, Typespace, Seen>
        : CheckForShallowCycleRecurse<
              KeyValuate<Typespace, Current>,
              Typespace,
              Seen | Current
          >
    : never

type CheckForShallowCycleRecurse<Def, Typespace, Seen> = IsAny<Def> extends true
    ? never
    : Def extends Seen
    ? Seen
    : Def extends string
    ? CheckReferencesForShallowCycle<
          Str.References<
              Def,
              {
                  asList: true
                  asUnorderedList: false
                  filter: keyof Typespace & string
              }
          >,
          Typespace,
          Seen
      >
    : never

type CheckForShallowCycle<Def, Typespace> = CheckForShallowCycleRecurse<
    Def,
    Typespace,
    never
>

export namespace Resolution {
    export type Definition = Root.Definition

    export type Validate<Def, Typespace> = IsAny<Def> extends true
        ? "any"
        : CheckForShallowCycle<Def, Typespace> extends never
        ? Root.Validate<Def, Typespace>
        : ShallowCycleError<Def & string, CheckForShallowCycle<Def, Typespace>>

    export type Parse<Def, Typespace, Options extends ParseConfig> = Root.Parse<
        Def,
        Typespace,
        Options
    >
}
