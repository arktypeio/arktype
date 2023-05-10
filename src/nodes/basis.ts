import { writeUnboundableMessage } from "../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../parse/ast/divisor.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { domainOf } from "../utils/domains.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { constructor } from "../utils/objectKinds.js"
import { constructorExtends, prototypeKeysOf } from "../utils/objectKinds.js"
import type { Key } from "../utils/records.js"
import { stringify } from "../utils/serialize.js"
import {
    type CompilationState,
    compileSerializedValue,
    In
} from "./compilation.js"
import type { DisjointKindEntries } from "./disjoint.js"
import { Disjoint } from "./disjoint.js"
import { Node } from "./node.js"
import { type ConstraintKind, PredicateNode } from "./predicate.js"
import type { ProblemRules } from "./problems.js"
import { registry } from "./registry.js"
import { TypeNode } from "./type.js"

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
        : typeof basis === "function"
        ? "class"
        : throwInternalError(
              `Unexpectedly got a basis of type ${domainOf(basis)}`
          )

const hasLevel = <level extends BasisLevel>(
    basis: Basis,
    level: level
): basis is Basis<level> => levelOf(basis) === level

export class BasisNode<
    level extends BasisLevel = BasisLevel
> extends Node<"basis"> {
    static readonly kind = "basis"
    readonly level: level
    readonly domain: Domain
    readonly levelPrecedence: 0 | 1 | 2

    constructor(public rule: Basis<level>) {
        super(BasisNode, rule)
        this.level = levelOf(rule) as level
        if (this.hasLevel("domain")) {
            this.domain = this.rule
            this.levelPrecedence = 2
        } else if (this.hasLevel("class")) {
            this.domain = "object"
            this.levelPrecedence = 1
        } else {
            this.domain = domainOf(this.getLiteralValue())
            this.levelPrecedence = 0
        }
    }

    getLiteralValue(): level extends "value" ? unknown : undefined {
        return (this.hasLevel("value") ? this.rule[1] : undefined) as never
    }

    getConstructor(): constructor | undefined {
        if (this.hasLevel("domain")) {
            return this.rule === "object" ? Object : undefined
        } else if (this.hasLevel("class")) {
            return this.rule
        }
        return this.domain === "object"
            ? Object(this.getLiteralValue()).constructor
            : undefined
    }

    hasConstructorExtending(...oneOf: [constructor, ...constructor[]]) {
        const actual = this.getConstructor()
        if (!actual) {
            return false
        }
        return oneOf.some((base) => constructorExtends(actual, base))
    }

    hasLevel<level extends BasisLevel>(
        level: level
    ): this is {
        level: level
        rule: Basis<level>
        getLiteralValue: () => level extends "value" ? unknown : never
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
                : Disjoint.from("class", l, r)
        }
        const disjointEntries: DisjointKindEntries = []
        if (l.domain !== r.domain) {
            disjointEntries.push(["domain", { l, r }])
        }
        if (l.hasLevel("value") && r.hasLevel("value")) {
            if (l !== r) {
                disjointEntries.push(["value", { l, r }])
            }
        }
        return disjointEntries.length
            ? Disjoint.fromEntries(disjointEntries)
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

    static compile(rule: Basis) {
        if (hasLevel(rule, "domain")) {
            return rule === "object"
                ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
                : `typeof ${In} === "${rule}"`
        } else if (hasLevel(rule, "value")) {
            return `${In} === ${compileSerializedValue(rule[1])}`
        } else {
            return `${In} instanceof ${
                rule === Array ? "Array" : registry().register(rule.name, rule)
            }`
        }
    }

    assertAllowsConstraint(kind: ConstraintKind) {
        if (this.hasLevel("value")) {
            if (kind !== "morph") {
                throwInvalidConstraintError(
                    kind,
                    "a non-literal type",
                    stringify(this.getLiteralValue())
                )
            }
            return
        }
        switch (kind) {
            case "divisor":
                if (this.domain !== "number") {
                    throwParseError(writeIndivisibleMessage(this.domain))
                }
                return
            case "range":
                if (
                    this.domain !== "string" &&
                    this.domain !== "number" &&
                    !this.hasConstructorExtending(Array, Date)
                ) {
                    throwParseError(writeUnboundableMessage(this.domain))
                }
                return
            case "regex":
                if (this.domain !== "string") {
                    throwInvalidConstraintError(
                        "regex",
                        "a string",
                        this.domain
                    )
                }
                return
            case "props":
                if (this.domain !== "object") {
                    throwInvalidConstraintError(
                        "props",
                        "an object",
                        this.domain
                    )
                }
                return
            case "narrow":
                return
            case "morph":
                return
            default:
                throwInternalError(`Unexpxected rule kind '${kind}'`)
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

    private _keyof?: TypeNode
    keyof(): TypeNode {
        if (this._keyof) {
            return this._keyof
        }
        this._keyof = new TypeNode(
            this.literalKeysOf().map(
                (k) => new PredicateNode([new BasisNode(["===", k])])
            )
        )
        return this._keyof
    }

    literalKeysOf(): Key[] {
        if (this.hasLevel("value")) {
            const value = this.getLiteralValue()
            if (value === null || value === undefined) {
                return []
            }
            return [...prototypeKeysOf(value), ...Object.keys(value)]
        }
        if (this.hasLevel("class")) {
            return prototypeKeysOf(this.rule)
        }
        return [...baseKeysByDomain[this.domain]]
    }
}

const baseKeysByDomain: Record<Domain, readonly Key[]> = {
    bigint: prototypeKeysOf(0n),
    boolean: prototypeKeysOf(false),
    null: [],
    number: prototypeKeysOf(0),
    // TS doesn't include the Object prototype in keyof, so keyof object is never
    object: [],
    string: prototypeKeysOf(""),
    symbol: prototypeKeysOf(Symbol()),
    undefined: []
}

export const writeInvalidConstraintMessage = (
    kind: ConstraintKind,
    typeMustBe: string,
    typeWas: string
) => {
    return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
}

export const throwInvalidConstraintError = (
    ...args: Parameters<typeof writeInvalidConstraintMessage>
) => throwParseError(writeInvalidConstraintMessage(...args))
