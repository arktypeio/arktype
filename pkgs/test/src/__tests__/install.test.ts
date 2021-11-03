import { fromHere, getRedoExecutablePath } from "@re-do/node"
import { join } from "path"
import { existsSync, rmSync } from "fs"
import { install } from "../install"

const REDO_DIR = fromHere(".redo")
const TEST_VERSION = "0.1.5"
const VERSION_DIR = join(REDO_DIR, TEST_VERSION)
const EXECUTABLE_PATH = getRedoExecutablePath(VERSION_DIR)

const deleteTestDir = () => rmSync(REDO_DIR, { recursive: true, force: true })

describe("installation", () => {
    beforeEach(() => {
        deleteTestDir()
    })
    afterEach(() => {
        deleteTestDir()
    })
    test("works", async () => {
        await install(TEST_VERSION, VERSION_DIR)
        expect(existsSync(EXECUTABLE_PATH)).toBe(true)
    }, 120000)
})
