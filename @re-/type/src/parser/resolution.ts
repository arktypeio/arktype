import type { ElementOf, Get, IsAny, IterateType, Join } from "@re-/tools"
import type { ParseError } from "./common.js"
import type { Root } from "./root.js"
import type { Str } from "./str/str.js"

export namespace ResolutionType {
    export type Validate<
        Alias extends keyof Dict,
        Dict
    > = Dict[Alias] extends string
        ? ValidateStringResolution<Alias, Dict>
        : Root.Validate<Dict[Alias], Dict>

    export type ValidateStringResolution<
        Alias extends keyof Dict,
        Dict
    > = IfShallowCycleErrorElse<
        CheckResolutionForShallowCycle<
            Dict[Alias],
            Dict,
            [Extract<Alias, string>]
        >,
        Str.Validate<Extract<Dict[Alias], string>, Dict>
    >
}

// const shallowCycleError = (shallowSeen: string[]) =>
//     `${shallowSeen[0]} references a shallow cycle: ${shallowSeen.join("=>")}.`

type ShallowCycleError<Seen extends string[]> =
    ParseError<`${Seen[0]} references shallow cycle ${Join<Seen, "=>">}.`>

type CheckResolutionForShallowCycle<
    Resolution,
    Dict,
    Seen extends string[]
> = IsAny<Resolution> extends true
    ? []
    : CheckResolutionForShallowCycleRecurse<Resolution, Dict, Seen>

/** For a given resolution, check it's shallow references to other aliases for cycles */
type CheckResolutionForShallowCycleRecurse<
    Resolution,
    Dict,
    Seen extends string[]
> = Resolution extends string
    ? IterateReferencesForShallowCycle<
          Str.References<Resolution, Dict>,
          Dict,
          Seen
      >
    : []

/**  For a list of string references, if any is in Seen, return Seen plus that reference,
 *   to represent the path at which the cycle occured. Otherwise, append the reference to seen and recurse.  */
type IterateReferencesForShallowCycle<
    References,
    Dict,
    Seen extends string[]
> = References extends IterateType<string, infer Current, infer Remaining>
    ? Current extends keyof Dict
        ? Current extends ElementOf<Seen>
            ? [...Seen, Current]
            : IfShallowCycleTupleElse<
                  CheckResolutionForShallowCycleRecurse<
                      Get<Dict, Current>,
                      Dict,
                      [...Seen, Current]
                  >,
                  IterateReferencesForShallowCycle<Remaining, Dict, Seen>
              >
        : IterateReferencesForShallowCycle<Remaining, Dict, Seen>
    : []

/** When we detect a ShallowCycle, the generic will return a string tuple representing the cycle path.
 *  Otherwise, we return an empty tuple if no tuple is detected.
 *  This generic simply returns cycle path if it is not an empty tuple, otherwise it will return Else.
 */
type IfShallowCycleTupleElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : CheckResult

type IfShallowCycleErrorElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : ShallowCycleError<CheckResult>
