/**
 * Modulo should be similar in terms of complexity to the adjacent "list.ts"
 * file. The main difference is that instead of creating a new node and setting
 * the root to be that node, we are:
 *
 * 1. Validating that the existing root node is a numberNode (should use the state.hasRoot typeguard)
 * 2. After encountering the modulo token, we need to parse the next operand and validate that it is a number.
 * Once we do that, we will use it to create a moduloConstraint:
 *
 * const moduloValue = s.r.shiftUntil(untilNextSuffix)
 *
 * 3. Setting the "modulo" property of that node to be a new instance of moduloConstraint
 */

import { Base } from "../../nodes/base.js"
import { NumberLiteralDefinition } from "../operand/unenclosed.js"
import { left, Left } from "../parser/left.js"
import { parserState, ParserState } from "../parser/state.js"

// When we use this type/invoke the corresponding function, we will have
// Already shifted past the "%" token, and should be expecting a numeric value before the next suffix
// Refer to "ParseSuffixBound" in bound/right.ts, should similarly return the updated state with a new
// Constraint or return a ParseError
export type ParseModulo<S extends ParserState.Of<Left.Suffix>> =
    S["R"] extends ModuloValueWithSingleCharacterSuffix<
        infer Value,
        infer NextSingleCharacterSuffix,
        infer Unscanned
    >
        ? // The new state that is returned should be a Constrained node, i.e.
          // Since modulo is the first suffix constraint (i.e. it comes before
          // bounds) it will always constrain an unconstrained node. In
          // constrast, if an expression has both a modulo and bounds
          // constraint, instead of createing a new node, the bounds constraints
          // should be appended to the existing singleton list of constraints
          // consisting of the modulo constraint. This is an example of what the
          // new root might look like, but you'll want to return the whole state
          // here as in ParseSuffixBound
          // Use the "AddConstraint" type we built. Even though currently we know
          // that the root will never be constrained, doing this proactively ensures
          // the next person to add a constraint doesn't have to worry about assumptions made
          // in modulo
          [S["L"]["root"], [["%", 10]]]
        : S["R"] extends ModuloValueWithTwoCharacterSuffix<
              infer Value,
              infer NextTwoCharacterSuffix,
              infer Unscanned
          >
        ? {}
        : S["R"] extends NumberLiteralDefinition<infer Value>
        ? {}
        : {}

type ModuloValueWithSingleCharacterSuffix<
    Value extends number,
    NextSuffix extends "?" | "<" | ">",
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

type ModuloValueWithTwoCharacterSuffix<
    Value extends number,
    NextSuffix extends "<=" | ">=" | "==",
    Unscanned extends string
> = `${Value}${NextSuffix}${Unscanned}`

export const parseModulo = (s: parserState<left.suffix>, ctx: Base.context) => {
    return s
}
