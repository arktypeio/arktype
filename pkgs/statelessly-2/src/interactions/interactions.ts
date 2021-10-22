import {
    NonRecursible,
    Unlisted,
    DeepUnlisted,
    DeepUpdate,
    DeepPartial
} from "@re-do/utils"

export type InputFor<Stored, IdKey extends string> =
    | Omit<
          {
              [K in keyof Stored]: Stored[K] extends NonRecursible
                  ? Stored[K]
                  : InputFor<Stored[K], IdKey>
          },
          IdKey
      >
    | (IdKey extends keyof Stored ? number : never)

export type Interactions<
    Model,
    IdKey extends string,
    Stored = Unlisted<Model>,
    Input = InputFor<Stored, IdKey>
> = {
    create: (data: Input) => Stored
    all: () => Stored[]
    find: (by: FindArgs<Stored>) => Stored
    filter: (by: FindArgs<Stored>) => Stored[]
    with: (by: FindArgs<Stored>) => {
        remove: () => Stored
        update: (update: DeepUpdate<Input>) => Stored
    }
    where: (by: FindArgs<Stored>) => {
        remove: () => Stored[]
        update: (update: DeepUpdate<Input>) => Stored[]
    }
}

export type UpdateFunction<Input> = (
    args: any,
    context: any
) => DeepUpdate<Input> | Promise<DeepUpdate<Input>>

export type Actions<Input> = Record<
    string,
    DeepUpdate<Input> | UpdateFunction<Input>
>

export type FindArgs<T> = DeepPartial<T> | ((t: T) => boolean)

export type FindFunction<T, Multiple extends boolean> = <
    Args extends FindArgs<T>
>(
    args: Args
) => Multiple extends true ? T[] : T

export type FilterFunction<T> = <Args extends FindArgs<T>>(args: Args) => T[]
