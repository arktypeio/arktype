import { Project } from "ts-morph"
import { fromCwd } from "../fs.js"
import { getMapData } from "./mapTSfiles.js"

export const reTag = () => {
    const tsConfigPath = fromCwd("tsconfig.json")
    const project = new Project({
        tsConfigFilePath: tsConfigPath
    })
    const mappedData: Record<string, string> = {}
    getMapData(project, mappedData)

    return mappedData
}
