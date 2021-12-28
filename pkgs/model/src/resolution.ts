import { IsAny, Iteration, KeyValuate } from "@re-/tools"
import { ParseConfig, ShallowCycleError } from "./internal.js"
import { Root, Str } from "./definitions"

type CheckReferencesForShallowCycle<
    References extends string[],
    Space,
    Seen
> = References extends Iteration<string, infer Current, infer Remaining>
    ? CheckForShallowCycleRecurse<
          KeyValuate<Space, Current>,
          Space,
          Seen | Current
      > extends never
        ? CheckReferencesForShallowCycle<Remaining, Space, Seen>
        : CheckForShallowCycleRecurse<
              KeyValuate<Space, Current>,
              Space,
              Seen | Current
          >
    : never

type CheckForShallowCycleRecurse<Def, Space, Seen> = IsAny<Def> extends true
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
                  filter: keyof Space & string
              }
          >,
          Space,
          Seen
      >
    : never

type CheckForShallowCycle<Def, Space> = CheckForShallowCycleRecurse<
    Def,
    Space,
    never
>

export namespace Resolution {
    export type Definition = Root.Definition

    export type Check<Def, Space> = IsAny<Def> extends true
        ? "any"
        : CheckForShallowCycle<Def, Space> extends never
        ? Root.Check<Def, Space>
        : ShallowCycleError<Def & string, CheckForShallowCycle<Def, Space>>

    export type Parse<Def, Space, Options extends ParseConfig> = Root.Parse<
        Def,
        Space,
        Options
    >
}
