import React from "react"
import { MutationResult, MutationFn } from "react-apollo"

export type MutationProps<V, R> = {
    children: (
        mutateFn: MutationFn<R, V>,
        result: MutationResult<R>
    ) => React.ReactNode
    variables: V
}

export type MutationComponentType<V, R> = React.ComponentType<
    MutationProps<V, R>
>
