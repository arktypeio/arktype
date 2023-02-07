import type { constructor, isTopType } from "./generics.ts"

// Built-in object constructors based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const defaultObjectKinds = {
    Array,
    Date,
    Error,
    Function,
    Map,
    RegExp,
    Set,
    Object,
    String,
    Number,
    Boolean,
    WeakMap,
    WeakSet,
    Promise
} satisfies ObjectKindSet

export type ObjectKindSet = Record<string, constructor>

export type DefaultObjectKindSet = typeof defaultObjectKinds

export type DefaultObjectKinds = {
    [kind in keyof DefaultObjectKindSet]: DefaultObjectKindSet[kind] extends constructor<
        infer t
    >
        ? t
        : never
}

export type DefaultObjectKind = keyof DefaultObjectKinds

export type objectKindOf<
    data extends object,
    kinds extends ObjectKindSet = DefaultObjectKindSet
> = isTopType<data> extends true
    ? keyof kinds
    : object extends data
    ? keyof kinds
    : {
          [kind in keyof kinds]: kinds[kind] extends constructor<data>
              ? kind
              : never
      }[keyof kinds]

export const objectKindOf = <
    o extends object,
    kinds extends ObjectKindSet = DefaultObjectKindSet
>(
    o: o,
    kinds?: kinds
) => {
    const kindSet: ObjectKindSet = kinds ?? defaultObjectKinds
    let constructor: constructor
    do {
        constructor = Object(o).constructor
    } while (
        !kindSet[constructor.name] ||
        !(o instanceof kindSet[constructor.name])
    )
    return constructor.name as objectKindOf<o, kinds>
}

export type inferKind<kind extends DefaultObjectKind> = DefaultObjectKinds[kind]

export const hasKind = <objectKind extends DefaultObjectKind>(
    data: unknown,
    objectKind: objectKind
): data is inferKind<objectKind> => objectKindOf(data) === objectKind
