export {}
// import { IsAny, Iteration, KeyValuate } from "@re-/tools"
// import { ShallowCycleError } from "./internal.js"
// import { Root, Str } from "./definitions/index.js"

// type CheckReferencesForShallowCycle<
//     References extends string[],
//     Space,
//     Seen
// > = References extends Iteration<string, infer Current, infer Remaining>
//     ? CheckForShallowCycleRecurse<
//           KeyValuate<Space, Current>,
//           Space,
//           Seen | Current
//       > extends never
//         ? CheckReferencesForShallowCycle<Remaining, Space, Seen>
//         : CheckForShallowCycleRecurse<
//               KeyValuate<Space, Current>,
//               Space,
//               Seen | Current
//           >
//     : never

// type CheckForShallowCycleRecurse<Def, Space, Seen> = IsAny<Def> extends true
//     ? never
//     : Def extends Seen
//     ? Seen
//     : Def extends string
//     ? CheckReferencesForShallowCycle<
//           Str.ReferencesOf<
//               Def,
//               Space,
//               { asTuple: true; asList: false; filter: keyof Space & string }
//           >,
//           Space,
//           Seen
//       >
//     : never

// type CheckForShallowCycle<Def, Space> = CheckForShallowCycleRecurse<
//     Def,
//     Space,
//     never
// >

// export type ValidateResolution<Def, Dict> = IsAny<Def> extends true
//     ? "any"
//     : CheckForShallowCycle<Def, Dict> extends never
//     ? Root.Validate<Def, Dict>
//     : ShallowCycleError<Def & string, CheckForShallowCycle<Def, Dict>>
