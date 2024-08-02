import type { Type as BaseType } from "../type.js"

/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends BaseType<t, $> {}

export type { Type as MorphType }
