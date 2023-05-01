import type { Domain, inferDomain } from "../utils/domains.js"
import { domainOf, hasKind } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { constructor, evaluate } from "../utils/generics.js"
import { constructorExtends, hasKeys } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive, stringify } from "../utils/serialize.js"
import type {
    CompilationState,
    CompiledAssertion,
    DisjointKinds
} from "./node.js"
import { Disjoint, Node } from "./node.js"
import type { ProblemRules } from "./problems.js"
import { In } from "./utils.js"

type BasesByLevel = {
    domain: Exclude<Domain, "undefined" | "null" | "boolean">
    class: constructor
    value: ["===", unknown]
}

export type Basis<level extends BasisLevel = BasisLevel> = BasesByLevel[level]

export type inferBasis<basis extends Basis> = basis extends Domain
    ? inferDomain<basis>
    : basis extends constructor<infer instance>
    ? instance
    : basis extends ["===", infer value]
    ? value
    : never

export type BasisLevel = evaluate<keyof BasesByLevel>

const levelOf = (basis: Basis): BasisLevel =>
    typeof basis === "string"
        ? "domain"
        : typeof basis === "object"
        ? "value"
        : "class"

const hasLevel = <level extends BasisLevel>(
    basis: Basis,
    level: level
): basis is Basis<level> => levelOf(basis) === level

export class BasisNode<level extends BasisLevel = BasisLevel> extends Node<
    typeof BasisNode
> {
    static readonly kind = "basis"
    readonly level: level
    readonly domain: Domain
    readonly literalValue?: level extends "value" ? unknown : never
    readonly levelPrecedence: 0 | 1 | 2

    constructor(public rule: Basis<level>) {
        super(BasisNode, rule)
        this.level = levelOf(rule) as level
        if (this.hasLevel("value")) {
            this.literalValue = this.rule[1] as never
            this.domain = domainOf(this.literalValue)
            this.levelPrecedence = 0
        } else if (this.hasLevel("domain")) {
            this.domain = this.rule
            this.levelPrecedence = 2
        } else {
            this.domain = "object"
            this.levelPrecedence = 1
        }
    }

    hasLevel<level extends BasisLevel>(
        level: level
    ): this is {
        level: level
        rule: Basis<level>
    } {
        return hasLevel(this.rule, level)
    }

    static intersect(l: BasisNode, r: BasisNode): BasisNode | Disjoint {
        if (l === r) {
            return l
        }
        if (l.hasLevel("class") && r.hasLevel("class")) {
            return constructorExtends(l.rule, r.rule)
                ? l
                : constructorExtends(r.rule, l.rule)
                ? r
                : Disjoint.from({ class: { l: l.rule, r: r.rule } })
        }
        const disjointKinds: DisjointKinds = {}
        if (l.domain !== r.domain) {
            disjointKinds.domain = {
                l: l.domain,
                r: r.domain
            }
        }
        if (l.hasLevel("value") && r.hasLevel("value")) {
            if (l.literalValue !== r.literalValue) {
                disjointKinds.value = {
                    l: l.literalValue,
                    r: r.literalValue
                }
            }
        }
        return hasKeys(disjointKinds)
            ? Disjoint.from(disjointKinds)
            : l.levelPrecedence < r.levelPrecedence
            ? l
            : r.levelPrecedence < l.levelPrecedence
            ? r
            : throwInternalError(
                  `Unexpected non-disjoint intersection from basis nodes with equal precedence ${stringify(
                      l.rule
                  )} and ${stringify(r.rule)}`
              )
    }

    static compile(rule: Basis): CompiledAssertion {
        if (hasLevel(rule, "domain")) {
            return rule === "object"
                ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
                : `typeof ${In} === "${rule}"`
        } else if (hasLevel(rule, "value")) {
            const value = rule[1]
            return `${In} === ${
                hasKind(value, "object") || typeof value === "symbol"
                    ? registry().register(typeof value, value)
                    : serializePrimitive(value as SerializablePrimitive)
            }`
        } else {
            return `${In} instanceof ${
                rule === Array ? "Array" : registry().register(rule.name, rule)
            }`
        }
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(
            this.key,
            s.problem(
                this.level,
                this.rule as ProblemRules[(typeof this)["level"]]
            )
        )
    }
}
