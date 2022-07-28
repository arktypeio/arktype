import { Box } from "@mui/material"
import React, { useEffect } from "react"
import { buildStackblitzIndexText } from "./stackblitzGenerators/buildStackblitzIndexText"
import { defaultFiles } from "./stackblitzGenerators/defaultFiles"
import { contentsByEmbedId } from "./stackblitzGenerators/rawDemoFIles"
import {
    createStackblitzDemo,
    DemoProps
} from "./stackblitzGenerators/stackblitzDemoBuilder"

export const StackBlitzDemo = ({ embedId, elementId }: DemoProps) => {
    useEffect(() => {
        createStackblitzDemo({
            files: {
                [`${embedId}.ts`]: contentsByEmbedId[embedId],
                "index.ts": buildStackblitzIndexText(embedId),
                ...defaultFiles
            },
            title: `${embedId}`,
            description: `Demo for ${embedId}`,
            embedId,
            elementId
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
