import { Store, Actions, StoreOptions, Listener, Update } from "statelessly"
import { listify, withDefaults } from "@re-do/utils"
import { existsSync, watch, readFileSync, writeFileSync } from "fs"

export type OnBadFile<T extends object> = (contents: string) => T
export type OnNoFile<T extends object> = () => T

export type FileStoreOnlyOptions<T extends object> = {
    path: string
    onBadFile?: OnBadFile<T>
    onNoFile?: OnNoFile<T>
    bidirectional?: boolean
}

export type FileStoreOptions<T extends object> = StoreOptions<T> &
    FileStoreOnlyOptions<T>

export class FileStore<T extends object, A extends Actions<T>> extends Store<
    T,
    A
> {
    private fileStateContext: FileStateContext<T>

    constructor(actions: A, options: FileStoreOptions<T>) {
        const withDefaultFileStoreOptions = withDefaults<
            FileStoreOnlyOptions<any>
        >({
            bidirectional: true,
            onBadFile: (contents) => {
                throw new Error(
                    `The contents of file at '${path}' are invalid:\n${contents}`
                )
            },
            onNoFile: () => {
                throw new Error(`No file exists at '${path}'.`)
            }
        })
        const { path, bidirectional, onBadFile, onNoFile, ...rest } =
            withDefaultFileStoreOptions(options)
        const baseStoreOptions = rest as StoreOptions<T>
        const fileStateContext: FileStateContext<T> = {
            path,
            onBadFile,
            onNoFile
        }
        const writeChangesToFile: Listener<T, T> = (changes, context) => {
            // Avoid an infinite loop if updates are bidrectional
            if (!("syncingFromFile" in context.action.meta)) {
                setFileState(this.getState(), fileStateContext)
            }
        }
        const onChangeWithFileWrite = listify(
            baseStoreOptions.onChange ?? []
        ).concat(writeChangesToFile)
        super(getFileState(fileStateContext), actions, {
            ...baseStoreOptions,
            onChange: onChangeWithFileWrite
        })
        this.fileStateContext = fileStateContext
        if (bidirectional) {
            watch(path, { persistent: false }, (event) => {
                this.syncFromFile()
            })
        }
    }

    refresh() {
        this.update(getFileState(this.fileStateContext) as any as Update<T>, {
            actionType: "refresh",
            meta: { syncingFromFile: true }
        })
    }

    private syncFromFile() {
        this.update(getFileState(this.fileStateContext) as any as Update<T>, {
            actionType: "syncFromFile",
            meta: { syncingFromFile: true }
        })
    }
}

type FileStateContext<T extends object> = {
    path: string
    onBadFile: OnBadFile<T>
    onNoFile: OnNoFile<T>
}

const getFileState = <T extends object>(ctx: FileStateContext<T>): T => {
    if (!existsSync(ctx.path)) {
        const fallbackState = ctx.onNoFile()
        writeFileSync(ctx.path, JSON.stringify(fallbackState, null, 4))
        return fallbackState
    }
    const contents = readFileSync(ctx.path).toString()
    try {
        return JSON.parse(contents)
    } catch {
        const fixedState = ctx.onBadFile(contents)
        writeFileSync(ctx.path, JSON.stringify(fixedState, null, 4))
        return fixedState
    }
}

const setFileState = <T extends object>(
    state: object,
    ctx: FileStateContext<T>
) => writeFileSync(ctx.path, JSON.stringify(state, null, 4))
