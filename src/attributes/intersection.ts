import type { Attributes } from "./attributes.js"
import { intersectBounds } from "./bounds.js"
import type { AttributeKey, IntersectionReducer } from "./shared.js"

export const intersection = (base: Attributes, attributes: Attributes) => {
    const intersection = { ...base, ...attributes }
    let k: keyof Attributes
    for (k in base) {
        if (intersection[k] !== base[k]) {
            intersection[k] = merge(intersection[k], base[k])
        }
    }
    return intersection
}

const merge = (left: any, right: any) => left

const defineIntersectionReducers = <
    intersections extends {
        [key in AttributeKey]?: IntersectionReducer<key>
    }
>(
    intersections: intersections
) => intersections

const intersectionReducers = defineIntersectionReducers({
    value: (base, value) => ({
        key: "value",
        base,
        conflicting: value
    }),
    type: (base, value) => ({
        key: "type",
        base,
        conflicting: value
    }),
    divisor: (base, value) => leastCommonMultiple(base, value),
    regex: (base, value) => `${base}${value}`,
    bounds: intersectBounds,
    baseProp: (base, value) => intersection(base, value),
    props: (base, value) => {
        const intersection = { ...base, ...value }
        for (const k in intersection) {
            if (k in base && k in value) {
                intersection[k] = intersection(base[k], value[k])
            }
        }
        return intersection
    },
    branches: (base, value) => [...base, ...value]
})
