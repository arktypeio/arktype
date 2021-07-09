import { ChildProcess, shellAsync } from "@re-do/node-utils"
import { join } from "path"
import { waitUntil } from "async-wait-until"
import treeKill from "tree-kill"
import psList, { ProcessDescriptor } from "ps-list"
import { rmSync } from "fs"
import { version, install, getExecutablePath } from "../install"

const REDO_DIR = join(__dirname, ".redo")
const VERSION_DIR = join(REDO_DIR, version)
let redoMainProcess: ChildProcess | undefined

describe("installation", () => {
    afterEach(() => {
        if (redoMainProcess && !redoMainProcess.killed) {
            treeKill(redoMainProcess.pid)
        }
        rmSync(REDO_DIR, { recursive: true, force: true })
    })
    test("works", async () => {
        await install(VERSION_DIR)
        redoMainProcess = shellAsync(getExecutablePath(VERSION_DIR))
        let redoRendererProcesses: ProcessDescriptor[] = []
        await waitUntil(
            async () => {
                const allProcesses = await psList()
                redoRendererProcesses = allProcesses.filter(
                    ({ cmd }) =>
                        cmd &&
                        cmd.search("redo") !== -1 &&
                        cmd.search("--type=renderer") !== -1
                )
                return !!redoRendererProcesses.length
            },
            { timeout: 60000 }
        )
        expect(redoRendererProcesses.length).toBe(1)
    }, 120000)
})
