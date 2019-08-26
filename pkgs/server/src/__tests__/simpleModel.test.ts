import { generateModel } from "../generateModel"
import { resolvers } from "./common"
import { join} from "path"
import { readFileSync, mkdtempSync, removeSync } from "fs-extra"

let inDir: string
let atPath: string

beforeAll(() => {
    inDir = mkdtempSync("temp-")
    atPath = join(inDir, "datamodel.prisma")
})

afterAll(() => {
    removeSync(inDir)
})

afterEach(() => {
    removeSync(atPath)
})

test("handles simple model", () => {
    generateModel({
        resolvers,
        atPath
    })
    expect(readFileSync(atPath).toString()).toMatchSnapshot()
})
