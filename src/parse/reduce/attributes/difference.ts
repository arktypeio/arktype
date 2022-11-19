import type { Attribute, AttributeKey } from "./attributes.js"

export type AttributeDifference<k extends AttributeKey> = (
    a: Attribute<k>,
    b: Attribute<k>
) => Attribute<k> | null
