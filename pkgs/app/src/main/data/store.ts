import { BaseStore, Actions, StoreOptions, Listener } from "react-statelessly"
import { writeJsonSync, readJsonSync } from "fs-extra"
import { listify } from "@re-do/utils"
import { existsSync, FSWatcher, watch } from "fs"

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
    private watcher?: FSWatcher

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
        const writeChangesToFile: Listener<T, T> = (changes, context) => {
            // Avoid an infinite loop if updates are bidrectional
            if (!("syncingFromFile" in context.action.meta)) {
                setFileState(path, this.getState())
            }
        }
        const onChangeWithFileWrite = listify(onChange ?? []).concat(
            writeChangesToFile
        )
        super(getFileState(path, fallback), actions, {
            onChange: onChangeWithFileWrite,
            ...otherOptions
        })
        this.fallback = fallback
        this.path = path
        if (bidirectional) {
            this.watcher = watch(this.path, {}, (event) => {
                this.syncFromFile()
            })
        }
    }

    refresh() {
        this.update(getFileState(this.path, this.fallback), {
            actionType: "refresh",
            meta: { syncingFromFile: true }
        })
    }

    private syncFromFile() {
        this.update(getFileState(this.path, this.fallback), {
            actionType: "syncFromFile",
            meta: { syncingFromFile: true }
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
