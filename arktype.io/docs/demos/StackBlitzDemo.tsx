import { Box } from "@mui/material"
import React, { useEffect } from "react"
import type { AddonFile, DemoProps } from "./stackblitzGenerators/index"
import {
    contentsByAddonFile,
    createStackblitzDemo,
    DEMO_ELEMENT_ID
} from "./stackblitzGenerators/index"

export const getAddonFiles = (addonFiles: AddonFile[]) => {
    const addon: Record<string, string> = {}
    for (const file of addonFiles) {
        addon[`${file}.ts`] = contentsByAddonFile[file]
    }
    return addon
}

export const StackBlitzDemo = (demoProps: DemoProps) => {
    useEffect(() => {
        createStackblitzDemo(demoProps)
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
            <div id={DEMO_ELEMENT_ID} />
        </Box>
    )
}
