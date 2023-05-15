import type { extractIn, extractOut } from "../../type.js"
import type { domainOf } from "../../utils/domains.js"
import type { error } from "../../utils/errors.js"
import type { equals, isAny } from "../../utils/generics.js"
import type { objectKindOf } from "../../utils/objectKinds.js"
import type { requiredKeyOf } from "./intersections.js"

export type validateUnion<l, r> = isAny<l | r> extends true
    ? undefined
    : [l] extends [never]
    ? undefined
    : [r] extends [never]
    ? undefined
    : [extractIn<l>, extractOut<r>] extends [infer lIn, infer rIn]
    ? [equals<l, lIn>, equals<r, rIn>] extends [true, true]
        ? undefined
        : findDiscriminant<lIn, rIn, []> extends string[]
        ? undefined
        : error<undiscriminatableMorphUnionMessage>
    : never

type findDiscriminant<l, r, path extends string[]> = path["length"] extends 5
    ? undefined
    : l & r extends never
    ? path
    : domainOf<l> & domainOf<r> extends never
    ? path
    : objectKindOf<l> & objectKindOf<r> extends never
    ? path
    : [objectKindOf<l>, objectKindOf<r>] extends ["Object", "Object"]
    ? {
          // TODO: Could be required in only one?
          [k in requiredKeyOf<l>]: k extends requiredKeyOf<r>
              ? findDiscriminant<l[k], r[k], [...path, k & string]>
              : undefined
      }[requiredKeyOf<l>]
    : undefined

type undiscriminatableMorphUnionMessage =
    `A union including one or more morphs must be discriminatable`
