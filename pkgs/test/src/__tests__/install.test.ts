import { ChildProcess, shell, shellAsync } from "@re-do/node-utils"
import { join } from "path"
import { waitUntil } from "async-wait-until"
import treeKill from "tree-kill"
import psList, { ProcessDescriptor } from "ps-list"
import { rmSync, existsSync , mkdirSync} from "fs"
import { version, install, getExecutablePath } from "../install"
import { latestVersionAvailable } from "../installHelpers"

const REDO_DIR = join(__dirname, ".redo")
const VERSION_DIR = join(REDO_DIR, version)
let redoMainProcess: ChildProcess | undefined


describe("installation", () => {
    afterEach(() => {
        killProcessesAndRemoveRedo()
    })
    test("installs current redo package", async () => {
        assertRedoInstalledAndStarts(VERSION_DIR)
    }, 60000)
})
describe("update installs newest version of redo", () => {
    let latestVersion : any
    let latestVersionTag : string
    beforeEach(async()=>{
        latestVersion = await latestVersionAvailable()
        const FAKE_DIR = join(REDO_DIR, "0.0.16")
        mkdirSync(FAKE_DIR, {recursive: true})
    })
    afterEach(()=>{
        killProcessesAndRemoveRedo()
    })
    test("update redo to latest available", async () => {
        const LATEST_DIR = join(REDO_DIR, latestVersion)
        await assertRedoInstalledAndStarts(LATEST_DIR)
    }, 60000)
})
const assertRedoInstalledAndStarts = async (dir:string) => {
    await install(dir)
        redoMainProcess = shellAsync(getExecutablePath(dir))
        let redoRendererProcesses: ProcessDescriptor[] = []
        await waitUntil(
            async () => {
                const allProcesses = await psList()
                redoRendererProcesses = allProcesses.filter(
                    (_) => _.cmd && (_.cmd.search("/.redo") !== -1) && (_.cmd.search("--renderer"))
                )
                return !!redoRendererProcesses.length
            },
            { timeout: 20000 }
        )
        expect(redoRendererProcesses.length).toBe(1)
}

const killProcessesAndRemoveRedo = () => {
    if (redoMainProcess && !redoMainProcess.killed) {
            treeKill(redoMainProcess.pid)
        }
        rmSync(REDO_DIR, { recursive: true, force: true })
}