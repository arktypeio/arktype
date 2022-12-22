import { arrayOf } from "../nodes/generics.js"
import { intersection } from "../nodes/intersection.js"
import type { TypeNode, TypeSet } from "../nodes/node.js"
import type { Validator } from "../nodes/rules/rules.js"
import { union } from "../nodes/union.js"
import { domainsOfNode } from "../nodes/utils.js"
import type { ScopeRoot } from "../scope.js"
import type { inferDomain } from "../utils/domains.js"
import { domainOf, hasDomain, hasSubdomain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { Dict, error, evaluate, List, mutable } from "../utils/generics.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { buildMissingRightOperandMessage } from "./shift/operand/unenclosed.js"
import type { Scanner } from "./shift/scanner.js"

export const parseTuple = (def: List, scope: ScopeRoot): TypeNode => {
    if (isTupleExpression(def)) {
        return parseTupleExpression(def, scope)
    }
    const props: Record<number, TypeNode> = {}
    for (let i = 0; i < def.length; i++) {
        props[i] = parseDefinition(def[i], scope)
    }
    return {
        object: {
            subdomain: "Array",
            props
        }
    }
}

export type inferTuple<
    def extends List,
    scope extends Dict,
    aliases
> = def extends UnknownTupleExpression
    ? inferTupleExpression<def, scope, aliases>
    : {
          [i in keyof def]: inferDefinition<def[i], scope, aliases>
      }

export type validateTuple<
    def extends List,
    scope extends Dict
> = def extends UnknownTupleExpression
    ? validateTupleExpression<def, scope>
    : {
          [i in keyof def]: validateDefinition<def[i], scope>
      }

type validateTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict
> = def[1] extends ":"
    ? validateNarrowTuple<def[0], scope>
    : def[1] extends "=>"
    ? validateMorphTuple<def[0], def[2], scope>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? error<buildMissingRightOperandMessage<def[1], "">>
        : [
              validateDefinition<def[0], scope>,
              def[1],
              validateDefinition<def[2], scope>
          ]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], scope>, "[]"]
    : never

type validateNarrowTuple<constrainedDef, scope extends Dict> = [
    validateDefinition<constrainedDef, scope>,
    ":",
    ValidatorImplementation<inferDefinition<constrainedDef, scope, scope>>
]

export type DistributedValidator<data = unknown> = evaluate<{
    [domain in domainOf<data>]?: Validator<
        unknown extends data ? unknown : Extract<data, inferDomain<domain>>
    >
}>

export type ValidatorImplementation<data> =
    | Validator<data>
    | DistributedValidator<data>

type validateMorphTuple<inputDef, outputDef, scope extends Dict> = [
    validateDefinition<inputDef, scope>,
    "=>",
    validateDefinition<outputDef, scope>,
    MorphImplementation<
        inferDefinition<inputDef, scope, scope>,
        inferDefinition<outputDef, scope, scope>
    >
]

export type MorphImplementation<input, output> =
    | Morph<input, output>
    | DistributedMorph<input, output>

export type Morph<input = unknown, output = unknown> = (data: input) => output

export type DistributedMorph<input = unknown, output = unknown> = evaluate<{
    [domain in domainOf<input>]?: Morph<
        unknown extends input ? unknown : Extract<input, inferDomain<domain>>,
        output
    >
}>

type inferTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict,
    aliases
> = def[1] extends ":"
    ? inferDefinition<def[0], scope, aliases>
    : def[1] extends "=>"
    ? inferDefinition<def[2], scope, aliases>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? never
        : def[1] extends "&"
        ? evaluate<
              inferDefinition<def[0], scope, aliases> &
                  inferDefinition<def[2], scope, aliases>
          >
        :
              | inferDefinition<def[0], scope, aliases>
              | inferDefinition<def[2], scope, aliases>
    : def[1] extends "[]"
    ? inferDefinition<def[0], scope, aliases>[]
    : never

export type TupleExpressionToken = "&" | "|" | "[]" | ":" | "=>"

type TupleExpressionParser<token extends TupleExpressionToken> = (
    def: UnknownTupleExpression<token>,
    scope: ScopeRoot
) => TypeNode

const parseBranchTuple: TupleExpressionParser<"|" | "&"> = (def, scope) => {
    if (def[2] === undefined) {
        return throwParseError(buildMissingRightOperandMessage(def[1], ""))
    }
    const l = parseDefinition(def[0], scope)
    const r = parseDefinition(def[2], scope)
    return def[1] === "&" ? intersection(l, r, scope) : union(l, r, scope)
}

const buildMalformedNarrowMessage = (validator: unknown) =>
    `Operator ":" requires a Function or Record<Domain, Function> as a right operand (${JSON.stringify(
        validator
    )} was invalid)`

const parseNarrowTuple: TupleExpressionParser<":"> = (def, scope) => {
    if (!hasDomain(def[2], "object")) {
        return throwParseError(buildMalformedNarrowMessage(def[2]))
    }
    const inputNode = parseDefinition(def[0], scope)
    const distributedValidatorNode: mutable<TypeSet> = {}
    const domains = domainsOfNode(inputNode, scope)
    if (typeof def[2] === "function") {
        for (const domain of domains) {
            distributedValidatorNode[domain] = { validator: def[2] }
        }
    } else {
        for (const domain of domains) {
            const domainValidator = (def[2] as DistributedValidator)[domain]
            if (domainValidator !== undefined) {
                if (typeof domainValidator !== "function") {
                    return throwParseError(
                        buildMalformedNarrowMessage(domainValidator)
                    )
                }
                distributedValidatorNode[domain] = {
                    validator: domainValidator
                }
            }
        }
    }
    return intersection(inputNode, distributedValidatorNode, scope)
}

const buildMalformedMorphMessage = (actual: unknown) =>
    `Operator "=>" requires a Function at index 3 (got ${domainOf(actual)})`

const parseMorphTuple: TupleExpressionParser<"=>"> = (def, scope) => {
    if (def[2] === undefined) {
        return throwParseError(buildMissingRightOperandMessage("=>", ""))
    }
    if (!hasSubdomain(def[3], "Function")) {
        return throwParseError(buildMalformedMorphMessage(def[3]))
    }
    const inputNode = parseDefinition(def[0], scope)
    const outputNode = parseDefinition(def[2], scope)
    return outputNode
}

const parseArrayTuple: TupleExpressionParser<"[]"> = (def, scope) =>
    arrayOf(parseDefinition(def[0], scope))

const tupleExpressionParsers: {
    [token in TupleExpressionToken]: TupleExpressionParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    ":": parseNarrowTuple,
    "=>": parseMorphTuple
}

const parseTupleExpression = (
    def: UnknownTupleExpression,
    scope: ScopeRoot
): TypeNode => tupleExpressionParsers[def[1]](def as any, scope)

const isTupleExpression = (def: List): def is UnknownTupleExpression =>
    typeof def[1] === "string" && def[1] in tupleExpressionParsers

export type UnknownTupleExpression<
    token extends TupleExpressionToken = TupleExpressionToken
> = [unknown, token, ...unknown[]]
