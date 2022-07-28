import { Box } from "@mui/material"
import model from "raw-loader!/stackblitz/generated/model.ts.raw"
import React, { useEffect } from "react"
import { defaultFiles } from "./stackblitzGenerators/defaultFiles"
import {
    createStackblitzDemo,
    DemoProps,
    Template
} from "./stackblitzGenerators/stackblitzDemoBuilder"
import { stackblitzIndexFileBuilder } from "./stackblitzGenerators/stackblitzIndexFileBuilder"

export const ModelDemo = ({ embedId, elementId }: DemoProps) => {
    useEffect(() => {
        createStackblitzDemo({
            files: {
                "model.ts": model,
                "index.ts": stackblitzIndexFileBuilder(embedId),
                ...defaultFiles
            },
            title: `${embedId}`,
            description: `Demo for ${embedId}`,
            template: Template.ts,
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
