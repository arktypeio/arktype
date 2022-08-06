import { Bound } from "../index.js"
import { Core } from "./core.js"
import { Expression } from "./expression.js"
import { Lex } from "./lex.js"
import { ErrorToken } from "./tokens.js"

// export type ParseAffixes<Def extends string, Dict> = ParseSuffixes<
//     Expression.T.InitialAffixes,
//     Lex.Definition<Def>,
//     Dict
// >

// type LeftBounded<
//     Value,
//     Token extends Bound.Token,
//     Unscanned extends unknown[]
// > = [Value, Token, ...Unscanned]

// type ParsePrefixes<
//     A extends Expression.T.Affixes,
//     Unscanned extends unknown[],
//     Dict
// > = Unscanned extends LeftBounded<infer Value, infer Token, infer Rest>
//     ? ParseExpression<
//           {
//               bounds: {
//                   right: A["bounds"]["right"]
//                   left: [Value, Token]
//               }
//               optional: A["optional"]
//           },
//           Rest,
//           Dict
//       >
//     : ParseExpression<A, Unscanned, Dict>

// type ParseExpression<
//     A extends Affixes,
//     Unscanned extends unknown[],
//     Dict
// > = Apply<
//     Core.ParseBase<Expression.T.Initial<Lex.ShiftToken<Unscanned>>, Dict>,
//     A
// >

// type IterateLeft<Next, Remaining extends unknown[]> = [...Remaining, Next]

// type RightBounded<
//     Unscanned extends unknown[],
//     Token extends Bound.Token,
//     Value
// > = [...Unscanned, Token, Value]

// // TODO: Add check for lexer error here
// type ParseSuffixes<
//     A extends Affixes,
//     Unscanned extends unknown[],
//     Dict
// > = Unscanned extends IterateLeft<"?", infer Rest>
//     ? ParseSuffixes<
//           {
//               bounds: {}
//               optional: true
//           },
//           Rest,
//           Dict
//       >
//     : Unscanned extends RightBounded<infer Rest, infer Token, infer Value>
//     ? ParsePrefixes<
//           {
//               bounds: {
//                   right: [Token, Value]
//               }
//               optional: A["optional"]
//           },
//           Rest,
//           Dict
//       >
//     : ParsePrefixes<A, Unscanned, Dict>

// export type Apply<
//     S extends Expression.T.State,
//     A extends Affixes
// > = S["tree"]["root"] extends ErrorToken<string>
//     ? S
//     : // TODO: Bounds should be validated before parse. Find a way to communicate better between phases
//     Bound.Validate<A["bounds"], S["tree"]["root"]> extends ErrorToken<
//           infer Message
//       >
//     ? Expression.T.Error<S, Message>
//     : A["optional"] extends true
//     ? Expression.T.From<{
//           tree: Expression.T.SetRoot<S, [S["tree"]["root"], "?"]>
//           scanner: S["scanner"]
//       }>
//     : S
