import { Test, RedoData } from "@re-do/model"
import { test as runTest, BrowserName, Context } from "@re-do/run"
import { createRedoFileDb } from "@re-do/data"
import { WithIds, FileDb } from "persist-statelessly"
import { join } from "path"

let _db: FileDb<RedoData>

const db = () => {
    if (!_db) {
        _db = createRedoFileDb({ bidirectional: false })
    }
    return _db
}

const defaultRedoConfigPath = join(process.cwd(), "redo.config")

export type RedoArgs = {
    id: number
}

export type Config = {
    defaultBrowser?: BrowserName
    customStepKinds?: Record<
        string,
        (args: Record<string, any>, context: Context) => Promise<void>
    >
}

export const defineConfig = (config: Config) => config

export const run = async ({ id }: RedoArgs) => {
    const {
        default: { defaultBrowser, customStepKinds }
    } = await import(defaultRedoConfigPath)
    const { steps } = db().tests.find((test) => test.id === id)
    await runTest(steps, {
        browser: defaultBrowser,
        customStepKinds
    })
}

export const getTests = (): WithIds<Test, "id">[] => db().tests.all()
