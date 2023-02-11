import type { asIn } from "../../scopes/type.ts"
import type { domainOf } from "../../utils/domains.ts"
import type {
    equals,
    error,
    extractValues,
    isAny,
    requiredKeyOf
} from "../../utils/generics.ts"
import type { objectKindOf } from "../../utils/objectKinds.ts"

export type inferUnion<l, r> = isAny<l | r> extends true
    ? any
    : [l] extends [never]
    ? r
    : [r] extends [never]
    ? l
    : [asIn<l>, asIn<r>] extends [infer lIn, infer rIn]
    ? [equals<l, lIn>, equals<r, rIn>] extends [true, true]
        ? l | r
        : discriminatable<lIn, rIn> extends true
        ? l | r
        : error<undiscriminatableMorphUnionMessage>
    : never

type discriminatable<l, r> = discriminatableRecurse<l, r, []> extends never
    ? false
    : true

type discriminatableRecurse<
    l,
    r,
    path extends string[]
> = path["length"] extends 10
    ? never
    : l & r extends never
    ? path
    : domainOf<l> & domainOf<r> extends never
    ? path
    : objectKindOf<l> & objectKindOf<r> extends never
    ? path
    : [objectKindOf<l>, objectKindOf<r>] extends ["Object", "Object"]
    ? extractValues<
          {
              [k in requiredKeyOf<l>]: k extends requiredKeyOf<r>
                  ? discriminatableRecurse<l[k], r[k], [...path, k & string]>
                  : never
          },
          string[]
      >
    : never

export const writeUndiscriminatableMorphUnionMessage = <path extends string>(
    path: path
) =>
    `${
        path === "/" ? "A" : `At ${path}, a`
    } union including one or more morphs must be discriminatable`

type undiscriminatableMorphUnionMessage =
    `A union including one or more morphs must be discriminatable`
