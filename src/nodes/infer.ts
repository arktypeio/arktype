import type { Keyword, Keywords } from "../scopes/keywords.js"
import type {
    Domain,
    inferDomain,
    ObjectKind,
    ObjectKinds
} from "../utils/domains.js"
import type { Dict, evaluate, List } from "../utils/generics.js"
import type { TypeNode, TypeSet } from "./node.js"
import type { Condition, ExactValue, Predicate } from "./predicate.js"
import type { PropSet, PropsRule } from "./rules/props.js"
import type { Rules, RuleSet } from "./rules/rules.js"

type Z = inferNode<{
    object: [
        { props: { required: { a: "true" }; optional: { b: "string" } } },
        { kind: "Array"; props: { required: { a: "boolean" } } }
    ]
    string: true
    number: [{ value: 5 }, { value: 7 }]
}>

export type inferNode<
    node extends TypeNode,
    scope extends Dict = {}
> = node extends TypeSet
    ? {
          [domain in keyof node]: inferPredicate<domain, node[domain], scope>
      }[keyof node]
    : node extends keyof scope
    ? scope[node]
    : never

type inferPredicate<
    domain extends Domain,
    predicate extends Predicate,
    scope extends Dict
> = predicate extends true
    ? inferDomain<domain>
    : inferCondition<domain, conditionFrom<predicate>, scope>

type conditionFrom<predicate extends Predicate> = predicate extends List
    ? predicate[number]
    : predicate

type inferCondition<
    domain extends Domain,
    condition,
    scope extends Dict
> = condition extends ExactValue
    ? condition["value"]
    : condition extends string
    ? Extract<
          condition extends Keyword
              ? Keywords[condition]
              : condition extends keyof scope
              ? scope[condition]
              : never,
          inferDomain<domain>
      >
    : domain extends "object"
    ? inferObject<condition, scope>
    : inferDomain<domain>

type inferObject<rules extends Rules, scope extends Dict> = evaluate<
    (rules["kind"] extends ObjectKind ? ObjectKinds[rules["kind"]] : unknown) &
        (rules["props"] extends PropsRule
            ? inferProps<rules["props"], scope>
            : unknown)
>

type inferProps<
    props extends PropsRule,
    scope extends Dict
> = (props["required"] extends PropSet
    ? { [k in keyof props["required"]]: inferNode<props["required"][k], scope> }
    : {}) &
    (props["optional"] extends PropSet
        ? {
              [k in keyof props["optional"]]?: inferNode<
                  props["optional"][k],
                  scope
              >
          }
        : {})
