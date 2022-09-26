import type {
    ElementOf,
    Evaluate,
    Get,
    IsAny,
    IterateType,
    Join,
    Narrow
} from "@re-/tools"
import type { Root } from "../parser/root.js"
import type { Str } from "../parser/str/str.js"

export type ParseSpace<Space> = {
    [Name in keyof Space]: Root.Parse<Space[Name], { Space: Space }>
}

export type ValidateAliases<Space> = Evaluate<{
    [Name in keyof Space]: Root.Validate<Space[Name], { Space: Space }>
}>

// S["Aliases"][Alias] extends string
// ? ValidateStringResolution<Alias, S>
// : Root.Validate<S["Aliases"][Alias], S>

// TODO: Implement runtime equivalent for these
// export type ValidateMeta<Meta, Aliases> = {
//     onResolve?: Root.Validate<
//         Get<Meta, "onResolve">,
//         Aliases & { $resolution: "unknown" }
//     >
// }

export type ValidateStringResolution<
    Name extends keyof Space,
    Space
> = IfShallowCycleErrorElse<
    CheckResolutionForShallowCycle<Space[Name], Space, [Extract<Name, string>]>,
    Str.Validate<Extract<Space[Name], string>, { Space: Space }>
>

export const shallowCycleMessage = <Seen extends string[]>(
    shallowSeen: Narrow<Seen>
): ShallowCycleMessage<Seen> =>
    `${shallowSeen[0]} references a shallow cycle: ${
        shallowSeen.join("=>") as any
    }`

type ShallowCycleMessage<Seen extends string[]> =
    `${Seen[0]} references a shallow cycle: ${Join<Seen, "=>">}`

export type CheckResolutionForShallowCycle<
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
          [],
          //RootNode.References<Resolution, false>,
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

export type IfShallowCycleErrorElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : ShallowCycleMessage<CheckResult>
