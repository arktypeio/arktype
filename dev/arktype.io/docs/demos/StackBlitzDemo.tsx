import { LinearProgress, Stack } from "@mui/material"
import React, { useEffect, useState } from "react"
import type { DemoProps } from "./stackblitzGenerators/createStackblitzDemo"
import {
    createStackblitzDemo,
    DEMO_ELEMENT_ID
} from "./stackblitzGenerators/createStackblitzDemo"

export const StackBlitzDemo = (demoProps: DemoProps) => {
    const [isLoading, setIsLoading] = useState(true)
    useEffect(() => {
        createStackblitzDemo(demoProps).then(() => setIsLoading(false))
    }, [])
    return (
        <Stack width="100%" height="600px">
            {isLoading ? <LinearProgress /> : null}
            <div id={DEMO_ELEMENT_ID} />
        </Stack>
    )
}
