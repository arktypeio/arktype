import { Box } from "@mui/material"
import React, { useEffect } from "react"
import { buildStackblitzIndexText } from "./stackblitzGenerators/buildStackblitzIndexText"
import {
    AddonFile,
    createStackblitzDemo,
    DemoProps
} from "./stackblitzGenerators/createStackblitzDemo"
import { defaultFiles } from "./stackblitzGenerators/defaultFiles"
import {
    contentsByAddonFile,
    contentsByEmbedId
} from "./stackblitzGenerators/rawDemoFiles"
const getAddonFiles = (addonFiles: AddonFile[]) => {
    const addon: Record<string, string> = {}
    for (const file of addonFiles) {
        addon[`${file}.ts`] = contentsByAddonFile[file]
    }
    return addon
}

export const StackBlitzDemo = ({ embedId, addonFiles }: DemoProps) => {
    useEffect(() => {
        createStackblitzDemo({
            files: {
                [`${embedId}.ts`]: contentsByEmbedId[embedId],
                "index.ts": buildStackblitzIndexText(embedId),
                ...defaultFiles,
                ...getAddonFiles(addonFiles ?? [])
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
