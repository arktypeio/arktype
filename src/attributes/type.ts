import type { DynamicTypeName } from "../internal.js"
import type { Attributes } from "./attributes.js"

export type TypeAttribute = DynamicTypeName | "never"

export const reduceType: Attributes.Reducer<[typeName: TypeAttribute]> = (
    base,
    typeName
) =>
    base.hasType === typeName
        ? base
        : // TODO: Figure out how to help users avoid this.
          // Maybe add a never reason in case it ends up in the final
          // tree? Is there a use case for a non-explicit never? If not,
          // can we throw here? Think about when it would occur and try
          // to construct a scenario where someone would want to keep
          // it.
          { ...base, hasType: base.hasType ? "never" : typeName }
