import {
    IsAny,
    Iteration,
    KeyValuate,
    StringifyPossibleTypes
} from "@re-/tools"
import { Common } from "./nodes/common.js"
import { Root, Str } from "./nodes/index.js"

export type ShallowCycleError<
    Def extends string = string,
    Seen extends string = string
> = Common.Parser.ParseErrorMessage<`${Def} references a shallow cycle: ${StringifyPossibleTypes<Seen>}.`>

export const shallowCycleError = (def: unknown) =>
    `${Common.stringifyDef(def)} references a shallow cycle: ${[def].join(
        "=>"
    )}.`

type CheckReferencesForShallowCycle<References, Dict, Seen> =
    References extends Iteration<string, infer Current, infer Remaining>
        ? CheckForShallowCycleRecurse<
              KeyValuate<Dict, Current>,
              Dict,
              Seen | Current
          > extends never
            ? CheckReferencesForShallowCycle<Remaining, Dict, Seen>
            : CheckForShallowCycleRecurse<
                  KeyValuate<Dict, Current>,
                  Dict,
                  Seen | Current
              >
        : never

type CheckForShallowCycleRecurse<Def, Dict, Seen> = Def extends Seen
    ? Seen
    : Def extends string
    ? CheckReferencesForShallowCycle<Str.References<Def>, Dict, Seen>
    : never

type CheckForShallowCycle<Def, Dict> = IsAny<Def> extends true
    ? Def
    : CheckForShallowCycleRecurse<Def, Dict, never>

export type ParseResolution<Def, Dict> = Def extends keyof Dict
    ? Dict[Def] extends Common.Parser.ParseErrorMessage
        ? unknown
        : Root.Parse<Dict[Def], Dict, { [K in Def]: true }>
    : unknown

export type ValidateResolution<Def, Dict> = Def extends string
    ? CheckForShallowCycle<Def, Dict> extends never
        ? Root.Validate<Def, Dict>
        : ShallowCycleError<Def, CheckForShallowCycle<Def, Dict>>
    : Root.Validate<Def, Dict>
