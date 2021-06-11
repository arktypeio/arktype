import { BaseStore, Actions, StoreOptions, Listener } from "react-statelessly"
import { writeJsonSync, readJsonSync } from "fs-extra"
import { listify } from "@re-do/utils"
import { existsSync, watch, writeFileSync } from "fs"

export type LocalStoreOptions<T extends object> = StoreOptions<T> & {
    path: string
    bidirectional?: boolean
}

export class LocalStore<
    T extends object,
    A extends Actions<T>
> extends BaseStore<T, A> {
    private fallback: T
    private path: string

    constructor(
        fallback: T,
        actions: A,
        {
            path,
            bidirectional = true,
            onChange,
            ...otherOptions
        }: LocalStoreOptions<T>
    ) {
        const writeChangesToFile: Listener<T, BaseStore<T, A>> = () =>
            setFileState(path, this.getState())
        const onChangeWithFileWrite = listify(onChange ?? []).concat(
            writeChangesToFile
        )
        // if (bidirectional) {
        //     ensureFile(path, fallback)
        //     watch(path, {}, (event) => {
        //         this.syncToFile()
        //     })
        // }
        super(getFileState(path, fallback), actions, {
            onChange: onChangeWithFileWrite,
            ...otherOptions
        })
        this.fallback = fallback
        this.path = path
    }

    refresh() {
        this.underlying.dispatch({
            type: "refresh",
            payload: getFileState(this.path, this.fallback),
            meta: { statelessly: true }
        })
    }

    private syncToFile() {
        this.underlying.dispatch({
            type: "syncToFile",
            payload: getFileState(this.path, this.fallback),
            meta: { statelessly: true }
        })
    }
}

const validated = <T>(contents: any): T => contents

const getFileState = <T>(path: string, fallback: T): T => {
    ensureFile(path, fallback)
    const contents = readJsonSync(path)
    return validated(contents)
}

const setFileState = <T>(path: string, state: T) =>
    writeJsonSync(path, state, { spaces: 4 })

const ensureFile = <T>(path: string, fallback: T) => {
    if (!existsSync(path)) {
        setFileState(path, fallback)
    }
}
