import type { inferTerminal } from "../parse/string/ast.js"
import type {
    Domain,
    inferDomain,
    inferSubdomain,
    Subdomain
} from "../utils/domains.js"
import type { evaluate, HomogenousTuple, List } from "../utils/generics.js"
import type { TypeReference } from "./node.js"
import type { Predicate } from "./predicate.js"
import type { OptionalProp, PropsRule } from "./rules/props.js"
import type { LiteralRules, NarrowableRules } from "./rules/rules.js"
import type { SubdomainRule } from "./rules/subdomain.js"

// TODO: Fix morph, narrow inference
export type inferNode<
    node extends TypeReference<$>,
    $ = {}
> = node extends string
    ? inferTerminal<node, $>
    : {
          [domain in keyof node]: inferPredicate<
              // @ts-expect-error Some very odd inference behavior related to domain I can't resolve
              domain,
              node[domain],
              $
          >
      }[keyof node]

type inferPredicate<
    domain extends Domain,
    predicate extends Predicate,
    $
> = predicate extends true
    ? inferDomain<domain>
    : inferCondition<domain, conditionFrom<predicate>, $>

type conditionFrom<predicate extends Predicate> = predicate extends List
    ? predicate[number]
    : predicate

type inferCondition<
    domain extends Domain,
    condition,
    $
> = condition extends LiteralRules
    ? condition["value"]
    : domain extends "object"
    ? condition extends NarrowableRules
        ? inferObject<condition, $>
        : object
    : inferDomain<domain>

type inferObject<rules extends NarrowableRules, $> = evaluate<
    (rules["subdomain"] extends SubdomainRule
        ? inferSubdomainRule<rules["subdomain"], $>
        : unknown) &
        (rules["props"] extends PropsRule
            ? inferProps<rules["props"], $>
            : unknown)
>

type inferSubdomainRule<rule extends SubdomainRule, $> = rule extends Subdomain
    ? inferSubdomain<rule>
    : rule extends readonly [
          "Array",
          infer item extends TypeReference<$>,
          ...infer tupleArgs
      ]
    ? tupleArgs extends [infer length extends number]
        ? HomogenousTuple<inferNode<item, $>, length>
        : inferNode<item, $>[]
    : rule extends readonly ["Set", infer item extends TypeReference<$>]
    ? Set<inferNode<item, $>>
    : rule extends readonly [
          "Map",
          infer k extends TypeReference<$>,
          infer v extends TypeReference<$>
      ]
    ? Map<inferNode<k, $>, inferNode<v, $>>
    : never

type inferProps<props extends PropsRule, $> = {
    [k in requiredKeyOf<props>]: props[k] extends TypeReference<$>
        ? inferNode<props[k], $>
        : never
} & {
    [k in optionalKeyOf<props>]?: props[k] extends OptionalProp<$>
        ? inferNode<props[k][1], $>
        : never
}

type optionalKeyOf<props extends PropsRule> = {
    [k in keyof props]: props[k] extends OptionalProp ? k : never
}[keyof props]

type requiredKeyOf<props extends PropsRule> = Exclude<
    keyof props,
    optionalKeyOf<props>
>
