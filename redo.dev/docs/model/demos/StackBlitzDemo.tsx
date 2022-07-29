import { Box } from "@mui/material"
import React, { useEffect } from "react"
import { buildStackblitzIndexText } from "./stackblitzGenerators/buildStackblitzIndexText"
import { defaultFiles } from "./stackblitzGenerators/defaultFiles"
import { contentsByEmbedId } from "./stackblitzGenerators/rawDemoFiles"
import {
    createStackblitzDemo,
    DeclarationFiles,
    DemoProps
} from "./stackblitzGenerators/stackblitzDemoBuilder"
const getAddonFiles = (addonFiles: DeclarationFiles[]) => {
    const obj: Record<string, string> = {}
    addonFiles.forEach((file) => (obj[`${file}.ts`] = contentsByEmbedId[file]))
    return obj
}
export const StackBlitzDemo = ({ embedId, addonFiles }: DemoProps) => {
    useEffect(() => {
        createStackblitzDemo({
            files: {
                [`${embedId}.ts`]: contentsByEmbedId[embedId],
                "index.ts": buildStackblitzIndexText(embedId),
                ...defaultFiles,
                ...getAddonFiles(addonFiles!)
            },
            title: `${embedId}`,
            description: `Demo for ${embedId}`,
            embedId
        })
    }, [])
    return (
        <Box
            style={{
                width: "100%",
                height: "660px",
                border: 0,
                marginLeft: -8,
                marginRight: -8,
                padding: 16,
                overflow: "hidden",
                borderRadius: "8px"
            }}
        >
            <div id="demo"></div>
        </Box>
    )
}
