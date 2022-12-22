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
    aliases,
    input extends boolean
> = def extends UnknownTupleExpression
    ? inferTupleExpression<def, scope, aliases, input>
    : {
          [i in keyof def]: inferDefinition<def[i], scope, aliases, input>
      }

export type validateTuple<
    def extends List,
    scope extends Dict,
    input extends boolean
> = def extends UnknownTupleExpression
    ? validateTupleExpression<def, scope, input>
    : {
          [i in keyof def]: validateDefinition<def[i], scope, input>
      }

type validateTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict,
    input extends boolean
> = def[1] extends ":"
    ? validateNarrowTuple<def[0], scope, input>
    : def[1] extends "=>"
    ? validateMorphTuple<def[0], def[2], scope, input>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? error<buildMissingRightOperandMessage<def[1], "">>
        : [
              validateDefinition<def[0], scope, input>,
              def[1],
              validateDefinition<def[2], scope, input>
          ]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], scope, input>, "[]"]
    : never

type validateNarrowTuple<
    constrainedDef,
    scope extends Dict,
    input extends boolean
> = [
    validateDefinition<constrainedDef, scope, input>,
    ":",
    ValidatorImplementation<
        inferDefinition<constrainedDef, scope, scope, input>
    >
]

export type ValidatorImplementation<In> =
    | Validator<In>
    | distributeInput<In, boolean>

type validateMorphTuple<
    inputDef,
    outputDef,
    scope extends Dict,
    input extends boolean
> = [
    validateDefinition<inputDef, scope, true>,
    "=>",
    validateDefinition<outputDef, scope, input>,
    MorphImplementation<
        inferDefinition<inputDef, scope, scope, true>,
        inferDefinition<outputDef, scope, scope, input>
    >
]

export type MorphImplementation<In, Out> =
    | Morph<In, Out>
    | DistributedMorph<In, Out>

export type Morph<In, Out> = (In: In) => Out

export type DistributedMorph<In, Out> = distributeInput<In, Out>

export type distributeInput<In, Return> = evaluate<{
    [domain in domainOf<In>]?: (
        In: unknown extends In ? unknown : Extract<In, inferDomain<domain>>
    ) => Return
}>

type inferTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict,
    aliases,
    input extends boolean
> = def[1] extends ":"
    ? inferDefinition<def[0], scope, aliases, input>
    : def[1] extends "=>"
    ? input extends true
        ? inferDefinition<def[0], scope, aliases, input>
        : inferDefinition<def[2], scope, aliases, input>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? never
        : def[1] extends "&"
        ? evaluate<
              inferDefinition<def[0], scope, aliases, input> &
                  inferDefinition<def[2], scope, aliases, input>
          >
        :
              | inferDefinition<def[0], scope, aliases, input>
              | inferDefinition<def[2], scope, aliases, input>
    : def[1] extends "[]"
    ? inferDefinition<def[0], scope, aliases, input>[]
    : never

// TODO: Add default value
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
            const domainValidator = (
                def[2] as distributeInput<unknown, boolean>
            )[domain]
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
