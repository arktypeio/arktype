import type { MetaBranch } from "../../nodes/branch.ts"
import type { LiteralNode, Node } from "../../nodes/node.ts"
import type { Predicate } from "../../nodes/predicate.ts"
import type {
    MappedPropKey,
    OptionalProp,
    Prop,
    PropsRule
} from "../../nodes/rules/props.ts"
import type { LiteralRules, NarrowableRules } from "../../nodes/rules/rules.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type {
    constructor,
    evaluate,
    evaluateObjectOrFunction,
    HomogenousTuple,
    List,
    returnOf
} from "../../utils/generics.ts"
import type {
    BuiltinClass,
    DefaultObjectKind,
    inferObjectKind
} from "../../utils/objectKinds.ts"
import type { inferTerminal } from "./ast.ts"
import type { Out } from "./morph.ts"

export type inferNode<node extends Node<$>, $ = {}> = node extends string
    ? inferTerminal<node, $>
    : node extends Node<$>
    ? inferResolution<node, $> extends infer result
        ? result extends BuiltinClass
            ? // don't evaluate builtin classes like Date (expanding their prototype looks like a mess)
              result
            : evaluateObjectOrFunction<result>
        : never
    : never

export type inferResolution<node extends Node<$>, $> = {
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
    : inferBranch<domain, branchFrom<predicate>, $>

type branchFrom<predicate extends Predicate> = predicate extends List
    ? predicate[number]
    : predicate

type inferBranch<domain extends Domain, branch, $> = branch extends MetaBranch
    ? inferMorph<domain, branch, $>
    : inferRules<domain, branch, $>

type inferMorph<domain extends Domain, branch extends MetaBranch, $> = (
    In: inferBranch<domain, branch["rules"], $>
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

type inferObjectRules<
    rules extends NarrowableRules,
    $
> = rules["class"] extends DefaultObjectKind
    ? [rules["class"], rules["props"]] extends [
          "Array",
          {
              "[index]": Prop<$, infer indexNode>
              length?: Prop<$, infer lengthNode>
          }
      ]
        ? lengthNode extends LiteralNode<"number", infer value>
            ? HomogenousTuple<inferNode<indexNode, $>, value>
            : inferNode<indexNode, $>[]
        : inferObjectKind<rules["class"]>
    : rules["class"] extends constructor<infer instance>
    ? instance
    : rules["props"] extends PropsRule
    ? inferProps<rules["props"], $>
    : object

type inferProps<props extends PropsRule, $> = evaluate<
    {
        [k in requiredKeyOf<props>]: props[k] extends Prop<$, infer node>
            ? inferNode<node, $>
            : never
    } & {
        [k in optionalKeyOf<props>]?: props[k] extends OptionalProp<$>
            ? inferNode<props[k][1], $>
            : never
    }
>

type optionalKeyOf<props extends PropsRule> = {
    [k in keyof props]: props[k] extends OptionalProp ? k : never
}[keyof props]

type mappedKeyOf<props extends PropsRule> = Extract<keyof props, MappedPropKey>

type requiredKeyOf<props extends PropsRule> = Exclude<
    keyof props,
    optionalKeyOf<props> | mappedKeyOf<props>
>
