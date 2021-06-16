import { Store, Actions, StoreOptions, Listener, Update } from "statelessly"
import { listify, transform, Unlisted } from "@re-do/utils"
import { existsSync, watch, readFileSync, writeFileSync } from "fs"

export type FileStoreOptions<T extends object> = StoreOptions<T> & {
    path: string
    bidirectional?: boolean
}

type Persisted<O extends object> = {
    [K in keyof O]: O[K] extends object ? number : O[K]
} & {
    id: number
}

type Interactions<O extends object> = {
    persist: (o: O) => Persisted<O>
}

export class FileStore<
    T extends Record<string, object[]>,
    A extends Actions<T>
> extends Store<T, A> {
    private fallback: T
    private path: string
    model: { [K in keyof T]: Interactions<Unlisted<T[K]>> }

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
        this.model = transform(fallback, ([k, v]) => [
            k,
            {
                persist: (o: object) =>
                    this.update({
                        [k]: (_: object[]) => _.concat(o)
                    } as Update<T>)
            }
        ]) as any
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
