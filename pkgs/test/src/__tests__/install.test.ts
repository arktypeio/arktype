import { ChildProcess, shellAsync, fromHere } from "@re-do/node-utils"
import { join } from "path"
import { waitUntil } from "async-wait-until"
import treeKillCallback from "tree-kill"
import psList, { ProcessDescriptor } from "ps-list"
import { existsSync, rmSync } from "fs"
import { version, install, getExecutablePath } from "../install"
import { promisify } from "util"

const REDO_DIR = fromHere(".redo")
const VERSION_DIR = join(REDO_DIR, version)
const EXECUTABLE_PATH = getExecutablePath(VERSION_DIR)

const treeKill = promisify(treeKillCallback)

let redoMainProcess: ChildProcess | undefined

const getTestRendererProcesses = async () => {
    const processes = await getAllTestProcesses()
    return processes.filter(({ cmd }) => cmd?.includes("renderer"))
}

const getAllTestProcesses = async () => {
    const allProcesses = await psList()
    return allProcesses.filter(({ cmd }) => cmd?.includes(VERSION_DIR))
}

const killOldTestProcesses = async () => {
    const oldProcesses = await getAllTestProcesses()
    oldProcesses.forEach(async (p) => await treeKill(p.pid))
}

const ensureCleanEnv = async () =>
    waitUntil(async () => (await getAllTestProcesses()).length === 0, {
        timeout: 5000
    })

const deleteTestDir = () => rmSync(REDO_DIR, { recursive: true, force: true })

describe("installation", () => {
    beforeEach(async () => {
        deleteTestDir()
        await killOldTestProcesses()
        await ensureCleanEnv()
    })
    afterEach(async () => {
        deleteTestDir()
        if (redoMainProcess && !redoMainProcess.killed) {
            await treeKill(redoMainProcess.pid)
        }
        await ensureCleanEnv()
    })
    test("works", async () => {
        await install(VERSION_DIR)
        redoMainProcess = shellAsync(EXECUTABLE_PATH, {
            cwd: VERSION_DIR
        })
        // let redoRendererProcesses: ProcessDescriptor[] = []
        // await waitUntil(
        //     async () => {
        //         redoRendererProcesses = await getTestRendererProcesses()
        //         return !!redoRendererProcesses.length
        //     },
        //     { timeout: 60000 }
        // )
        // expect(redoRendererProcesses.length).toBe(1)
        await waitUntil(() => existsSync(join(VERSION_DIR, "redo.json")), {
            timeout: 10000
        })
    }, 120000)
})
