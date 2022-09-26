import type {
    ElementOf,
    Evaluate,
    Get,
    IsAny,
    IterateType,
    Join,
    Narrow
} from "@re-/tools"
import type { RootNode } from "../nodes/common.js"
import type { Root } from "../parser/root.js"
import type { Str } from "../parser/str/str.js"

export namespace Space {
    export type Definition = {
        Aliases: unknown
        Meta: MetaDefinitions
    }

    export namespace Definition {
        export type Raw = {
            Aliases: unknown
            Meta: unknown
        }

        export type From<D extends Raw> = Evaluate<
            D & {
                Meta: MetaDefinitions
            }
        >
    }

    export type Resolved = Evaluate<
        Definition & {
            Resolutions: unknown
        }
    >

    export namespace Resolved {
        export type Raw = Definition.Raw & {
            Resolutions: unknown
        }

        export type From<S extends Raw> = S & { Meta: MetaDefinitions }
        export type Empty = From<{ Aliases: {}; Resolutions: {}; Meta: {} }>
    }

    export type MetaDefinitions = {
        onResolve?: unknown
    }

    export type Parse<S extends Definition> = Root.Parse<S["Aliases"], S>

    export type ValidateAliases<Aliases, Meta> = Evaluate<{
        [Alias in keyof Aliases]: ValidateAlias<
            Alias,
            Definition.From<{
                Aliases: Aliases
                Meta: Meta
            }>
        >
    }>

    export type ValidateAlias<
        Alias extends keyof S["Aliases"],
        S extends Definition
    > = S["Aliases"][Alias] extends string
        ? ValidateStringResolution<Alias, S>
        : Root.Validate<S["Aliases"][Alias], S>

    // TODO: Implement runtime equivalent for these
    export type ValidateMeta<Meta, Aliases> = {
        onResolve?: Root.Validate<
            Get<Meta, "onResolve">,
            Definition.From<{
                Aliases: Aliases & { $resolution: "unknown" }
                Meta: Meta
            }>
        >
    }

    type ValidateStringResolution<
        Alias extends keyof S["Aliases"],
        S extends Definition
    > = IfShallowCycleErrorElse<
        CheckResolutionForShallowCycle<S[Alias], S, [Extract<Alias, string>]>,
        Str.Validate<Extract<S[Alias], string>, S>
    >
}

export const shallowCycleMessage = <Seen extends string[]>(
    shallowSeen: Narrow<Seen>
): ShallowCycleMessage<Seen> =>
    `${shallowSeen[0]} references a shallow cycle: ${
        shallowSeen.join("=>") as any
    }`

type ShallowCycleMessage<Seen extends string[]> =
    `${Seen[0]} references a shallow cycle: ${Join<Seen, "=>">}`

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
          RootNode.References<Resolution, false>,
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
> = [] extends CheckResult ? Else : ShallowCycleMessage<CheckResult>
