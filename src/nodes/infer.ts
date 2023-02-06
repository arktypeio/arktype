import type { inferTerminal } from "../parse/string/ast.js"
import type { Out } from "../parse/tuple/morph.js"
import type {
    Domain,
    inferDomain,
    inferSubdomain,
    Subdomain
} from "../utils/domains.js"
import type {
    evaluate,
    HomogenousTuple,
    List,
    returnOf
} from "../utils/generics.js"
import type { ResolvedNode, TypeNode } from "./node.js"
import type { Predicate } from "./predicate.js"
import type { OptionalProp, PropsRule } from "./rules/props.js"
import type { Bound, Range } from "./rules/range.js"
import type {
    LiteralRules,
    MorphBranch,
    NarrowableRules
} from "./rules/rules.js"
import type { SubdomainRule } from "./rules/subdomain.js"

export type inferNode<node extends TypeNode<$>, $ = {}> = node extends string
    ? inferTerminal<node, $>
    : node extends ResolvedNode<$>
    ? inferResolution<node, $>
    : never

export type inferResolution<node extends ResolvedNode<$>, $> = evaluate<
    {
        [domain in keyof node]: inferPredicate<
            // @ts-expect-error Some very odd inference behavior related to domain I can't resolve
            domain,
            node[domain],
            $
        >
    }[keyof node]
>

type inferPredicate<
    domain extends Domain,
    predicate extends Predicate,
    $
> = predicate extends true
    ? inferDomain<domain>
    : inferBranch<domain, branchFrom<predicate>, $>

type branchFrom<predicate extends Predicate> = predicate extends List
    ? predicate[number]
    : predicate

type inferBranch<domain extends Domain, branch, $> = branch extends MorphBranch
    ? inferMorph<domain, branch, $>
    : inferRules<domain, branch, $>

type inferMorph<domain extends Domain, branch extends MorphBranch, $> = (
    In: inferBranch<domain, branch["input"], $>
) => Out<
    branch["morph"] extends [...unknown[], infer tail]
        ? returnOf<tail>
        : returnOf<branch["morph"]>
>

type inferRules<domain extends Domain, branch, $> = branch extends LiteralRules
    ? branch["value"]
    : domain extends "object"
    ? branch extends NarrowableRules
        ? inferObjectRules<branch, $>
        : object
    : inferDomain<domain>

type inferObjectRules<rules extends NarrowableRules, $> = evaluate<
    (rules["subdomain"] extends SubdomainRule
        ? inferSubdomainRule<rules["subdomain"], rules["range"], $>
        : unknown) &
        (rules["props"] extends PropsRule
            ? inferProps<rules["props"], $>
            : unknown)
>

type inferSubdomainRule<
    rule extends SubdomainRule,
    possibleRange extends Range | undefined,
    $
> = rule extends Subdomain
    ? inferSubdomain<rule>
    : rule extends readonly ["Array", infer item extends TypeNode<$>]
    ? possibleRange extends Bound<"==">
        ? HomogenousTuple<inferNode<item, $>, possibleRange["limit"]>
        : inferNode<item, $>[]
    : rule extends readonly ["Set", infer item extends TypeNode<$>]
    ? Set<inferNode<item, $>>
    : rule extends readonly [
          "Map",
          infer k extends TypeNode<$>,
          infer v extends TypeNode<$>
      ]
    ? Map<inferNode<k, $>, inferNode<v, $>>
    : never

type inferProps<props extends PropsRule, $> = {
    [k in requiredKeyOf<props>]: props[k] extends TypeNode<$>
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
