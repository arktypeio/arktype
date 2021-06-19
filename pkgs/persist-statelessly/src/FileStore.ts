import { Store, Actions, StoreOptions, Listener, Update } from "statelessly"
import { listify } from "@re-do/utils"
import { existsSync, watch, readFileSync, writeFileSync } from "fs"

export type FileStoreOptions<T extends object> = StoreOptions<T> & {
    path: string
    bidirectional?: boolean
}

export class FileStore<T extends object, A extends Actions<T>> extends Store<
    T,
    A
> {
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
        }: FileStoreOptions<T>
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
            watch(this.path, {}, (event) => {
                this.syncFromFile()
            })
        }
    }

    refresh() {
        this.update(
            getFileState(this.path, this.fallback) as any as Update<T>,
            {
                actionType: "refresh",
                meta: { syncingFromFile: true }
            }
        )
    }

    private syncFromFile() {
        this.update(
            getFileState(this.path, this.fallback) as any as Update<T>,
            {
                actionType: "syncFromFile",
                meta: { syncingFromFile: true }
            }
        )
    }
}

const validated = <T>(contents: any): T => contents

const getFileState = <T>(path: string, fallback: T): T => {
    ensureFile(path, fallback)
    const contents = JSON.parse(readFileSync(path).toString())
    return validated(contents)
}

const setFileState = <T>(path: string, state: T) =>
    writeFileSync(path, JSON.stringify(state, null, 4))

const ensureFile = <T>(path: string, fallback: T) => {
    if (!existsSync(path)) {
        setFileState(path, fallback)
    }
}
