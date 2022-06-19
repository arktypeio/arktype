import { fromCwd } from "@re-/node"
import { Project } from "ts-morph"
import { getMapData } from "./mapTSfiles.js"

export type ReTagOptions = {
    include?: string[]
}

export type BlocksByPath = Record<string, string>

export const reTag = ({ include }: ReTagOptions = {}): BlocksByPath => {
    const tsConfigPath = fromCwd("tsconfig.json")
    const project = new Project({
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: true
    })
    project.addSourceFilesAtPaths(include ?? ["**"])
    const mappedData: Record<string, string> = {}
    getMapData(project, mappedData)
    return mappedData
}
