import { Box, CircularProgress } from "@mui/material"
import React, { useEffect, useState } from "react"
import type { DemoProps } from "./stackblitzGenerators/index"
import {
    createStackblitzDemo,
    DEMO_ELEMENT_ID
} from "./stackblitzGenerators/index"

// eslint-disable-next-line max-lines-per-function
export const StackBlitzDemo = (demoProps: DemoProps) => {
    const [isLoading, setIsLoading] = useState(true)
    useEffect(() => {
        ;(async () => {
            await createStackblitzDemo(demoProps)
            setIsLoading(false)
        })()
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
                borderRadius: "8px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }}
        >
            {isLoading ? (
                <CircularProgress
                    style={{ position: "absolute" }}
                    color="secondary"
                />
            ) : null}
            <div style={{ opacity: isLoading ? 0 : 1 }} id={DEMO_ELEMENT_ID} />
        </Box>
    )
}
