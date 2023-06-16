import { join } from "node:path"
import { fromHere } from "../attest/src/fs.js"

const root = fromHere("..", "..")
const dev = join(root, "dev")
const attest = join(dev, "attest")
const configs = join(dev, "configs")
const utils = join(dev, "utils")
const arktypeIo = join(dev, "arktype.io")
const docsDir = join(arktypeIo, "docs")
const srcRoot = join(root, "src")
const outRoot = join(root, "dist")

export const repoDirs = {
    root,
    dev,
    attest,
    configs,
    arktypeIo,
    docsDir,
    srcRoot,
    outRoot,
    utils
}
