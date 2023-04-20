import type { PropsInput } from "../../nodes/props.js"
import { TypeNode } from "../../nodes/type.js"
import { throwParseError } from "../../utils/errors.js"
import type {
    conform,
    constructor,
    error,
    evaluate,
    List,
    mutable
} from "../../utils/generics.js"
import type {
    inferDefinition,
    ParseContext,
    validateDefinition
} from "../definition.js"
import { parseDefinition } from "../definition.js"
import { writeMissingRightOperandMessage } from "../string/shift/operand/unenclosed.js"
import type { Scanner } from "../string/shift/scanner.js"
import { parseConfigTuple, type validateConfigTuple } from "./config.js"
import type { inferFilter, validateFilterTuple } from "./filter.js"
import { parseNarrowTuple } from "./filter.js"
import type { inferIntersection } from "./intersection.js"
import type { inferKeyOfExpression, validateKeyOfExpression } from "./keyof.js"
import { parseKeyOfTuple } from "./keyof.js"
import type { inferMorph, validateMorphTuple } from "./morph.js"
import { parseMorphTuple } from "./morph.js"
import type { inferUnion } from "./union.js"

export const parseTuple = (def: List, ctx: ParseContext): TypeNode => {
    if (isIndexOneExpression(def)) {
        return indexOneParsers[def[1]](def as never, ctx)
    }
    if (isIndexZeroExpression(def)) {
        return prefixParsers[def[0]](def as never, ctx)
    }
    const named: mutable<PropsInput["named"]> = {
        length: {
            kind: "prerequisite",
            value: { basis: ["===", def.length] }
        }
    }
    if (def.length > 0) {
        for (let i = 0; i < def.length; i++) {
            ctx.path.push(i)
            named[i] = {
                kind: "required",
                value: parseDefinition(def[i], ctx)
            }
            ctx.path.pop()
        }
    }
    return TypeNode.from({
        basis: Array,
        props: {
            named,
            indexed: []
        }
    })
}

export type validateTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "[]"
    ? conform<def, readonly [validateDefinition<def[0], $>, "[]"]>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? [def[0], error<writeMissingRightOperandMessage<def[1], "">>]
        : conform<
              def,
              readonly [
                  validateDefinition<def[0], $>,
                  def[1],
                  validateDefinition<def[2], $>
              ]
          >
    : def[1] extends "=>"
    ? validateFilterTuple<def, $>
    : def[1] extends "|>"
    ? validateMorphTuple<def, $>
    : def[1] extends ":"
    ? validateConfigTuple<def, $>
    : def[0] extends "==="
    ? conform<def, readonly ["===", unknown]>
    : def[0] extends "instanceof"
    ? conform<def, readonly ["instanceof", constructor]>
    : def[0] extends "keyof"
    ? conform<def, validateKeyOfExpression<def[1], $>>
    : never

export type UnparsedTupleExpressionInput = {
    instanceof: constructor
    "===": unknown
}

export type UnparsedTupleOperator = evaluate<keyof UnparsedTupleExpressionInput>

export type inferTuple<def extends List, $> = def extends TupleExpression
    ? inferTupleExpression<def, $>
    : {
          [i in keyof def]: inferDefinition<def[i], $>
      }

export type inferTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "[]"
    ? inferDefinition<def[0], $>[]
    : def[1] extends "&"
    ? inferIntersection<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "|"
    ? inferUnion<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "=>"
    ? inferFilter<def[0], def[2], $>
    : def[1] extends "|>"
    ? inferMorph<def[0], def[2], $>
    : def[1] extends ":"
    ? inferDefinition<def[0], $>
    : def[0] extends "==="
    ? def[1]
    : def[0] extends "instanceof"
    ? def[1] extends constructor<infer t>
        ? t
        : never
    : def[0] extends "keyof"
    ? inferKeyOfExpression<def[1], $>
    : never

const parseBranchTuple: PostfixParser<"|" | "&"> = (def, ctx) => {
    if (def[2] === undefined) {
        return throwParseError(writeMissingRightOperandMessage(def[1], ""))
    }
    const l = parseDefinition(def[0], ctx)
    const r = parseDefinition(def[2], ctx)
    return def[1] === "&" ? l.and(r) : l.or(r)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, scope) =>
    parseDefinition(def[0], scope).toArray()

export type PostfixParser<token extends IndexOneOperator> = (
    def: IndexOneExpression<token>,
    ctx: ParseContext
) => TypeNode

export type PrefixParser<token extends IndexZeroOperator> = (
    def: IndexZeroExpression<token>,
    ctx: ParseContext
) => TypeNode

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export const writeMalformedFunctionalExpressionMessage = (
    operator: FunctionalTupleOperator,
    rightDef: unknown
) =>
    `Expression requires a function following '${operator}' (was ${typeof rightDef})`

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

type IndexOneOperator = TuplePostfixOperator | TupleInfixOperator

export type TuplePostfixOperator = "[]"

export type TupleInfixOperator = "&" | "|" | "=>" | "|>" | ":"

export type IndexOneExpression<
    token extends IndexOneOperator = IndexOneOperator
> = readonly [unknown, token, ...unknown[]]

const isIndexOneExpression = (def: List): def is IndexOneExpression =>
    indexOneParsers[def[1] as IndexOneOperator] !== undefined

const indexOneParsers: {
    [token in IndexOneOperator]: PostfixParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    "=>": parseNarrowTuple,
    "|>": parseMorphTuple,
    ":": parseConfigTuple
}

export type FunctionalTupleOperator = "=>" | "|>"

export type IndexZeroOperator = "keyof" | "instanceof" | "==="

export type IndexZeroExpression<
    token extends IndexZeroOperator = IndexZeroOperator
> = readonly [token, ...unknown[]]

const prefixParsers: {
    [token in IndexZeroOperator]: PrefixParser<token>
} = {
    keyof: parseKeyOfTuple,
    instanceof: (def) => {
        if (typeof def[1] !== "function") {
            return throwParseError(
                `Expected a constructor following 'instanceof' operator (was ${typeof def[1]}).`
            )
        }
        return TypeNode.from({
            basis: def[1] as constructor
        })
    },
    "===": (def) => TypeNode.from({ basis: ["===", def[1]] })
}

const isIndexZeroExpression = (def: List): def is IndexZeroExpression =>
    prefixParsers[def[0] as IndexZeroOperator] !== undefined

/**
 * @operator {@link intersection | &}
 * @docgenTable
 * @string "L&R"
 * @tuple  [L, "&", R]
 * @helper  intersection(L,R)
 * @example string
 *      const intersection = type("/@arktype\.io$/ & email")
 * @example tuple
 *      const tupleIntersection = type(["/@arktype\.io$/", "&", "email"])
 * @example helper
 *      const helperIntersection = intersection("/@arktype\.io$/","email")
 */

/**
 * @operator {@link union | |}
 * @docgenTable
 * @string "L|R"
 * @tuple [L, "|" , R]
 * @helper union(L,R)
 * @example string
 *      const union = type("string|number")
 * @example tuple
 *      const tupleUnion = type(["string", "|", "number"])
 * @example helper
 *      const helperUnion = union("string", "number")
 */

/**
 * @operator {@link arrayOf}
 * @docgenTable
 * @string "T[]"
 * @tuple [T, "[]"]
 * @helper arrayOf(T)
 * @example string
 *      const numberArray = type("number[]")
 * @example tuple
 *      const tupleArray = type(["number", "[]"])
 * @example helper
 *      const helperArray = arrayOf("number")
 */

/**
 * @operator {@link keyOf}
 * @docgenTable
 * @tuple "["keyOf", T]"
 * @helper  keyOf(T)
 * @example tuple
 *      const tupleKeyOf = type(["keyOf", {a:"string"}])
 * @example helper
 *      const helperKeyOf = keyOf({a:"string"})
 */

/**
 * @operator {@link instanceOf}
 * @docgenTable
 * @tuple ["instanceOf", T]
 * @helper instanceOf(T)
 * @example tuple
 *      const tupleInstanceOf = type(["instanceOf", Date])
 * @example helper
 *      const helperInstanceOf = instanceOf(Date)
 */

/**
 * @operator {@link valueOf | ===}
 * @docgenTable
 * @tuple ["===", T]
 * @helper valueOf(T)
 * @example tuple
 *      const tupleValueOf = type(["valueOf", {a:"string"}])
 * @example helper
 *      const helperValueOf = valueOf({a:"string"})
 */

/**
 * @operator {@link narrow | =>}
 * @docgenTable
 * @tuple ["type", "=>" , condition]
 * @example tuple
 *      const narrow = type( ["number", "=>" , (n) => n % 2 === 0])
 * @example
 *      const isEven = (x: unknown): x is number => x % 2 === 0
 */

/**
 * @operator {@link morph | |>}
 * @docgenTable
 * @tuple [inputType, "|>", (data) => output]
 * @helper morph(inputType, (data) => output)
 * @example tuple
 *      const tupleMorph = type( ["string", "|>" , (data) => `morphed ${data}`])
 * @example helper
 *      const helperMorph = morph("string", (data) => `morphed ${data}`)
 */
