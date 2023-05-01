import { join } from "node:path"

const root = "."
const dev = "dev"
const attest = join(dev, "attest")
const configs = join(dev, "configs")
const arktypeIo = join(dev, "arktype.io")
const docsDir = join(arktypeIo, "docs")
const srcRoot = "src"
const outRoot = "dist"

export const repoDirs = {
    root,
    dev,
    attest,
    configs,
    arktypeIo,
    docsDir,
    srcRoot,
    outRoot
}
