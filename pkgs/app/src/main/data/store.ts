import { BaseStore, Actions, StoreOptions, Listener } from "react-statelessly"
import { writeJsonSync } from "fs-extra"
import { listify } from "@re-do/utils"

export type LocalStoreOptions<T extends object> = StoreOptions<T> & {
    path: string
}

export class LocalStore<
    T extends object,
    A extends Actions<T>
> extends BaseStore<T, A> {
    constructor(
        initial: T,
        actions: A,
        { path, onChange, ...otherOptions }: LocalStoreOptions<T>
    ) {
        const writeChangesToFile: Listener<T, LocalStore<T, A>> = () =>
            writeJsonSync(path, this.getState(), { spaces: 4 })
        const onChangeWithFileWrite = listify(onChange ?? []).concat(
            writeChangesToFile
        )
        super(initial, actions, {
            onChange: onChangeWithFileWrite,
            ...otherOptions
        })
    }
}
