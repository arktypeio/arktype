import { useLocation } from "@docusaurus/router"
import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import Terminal from "@mui/icons-material/Terminal"
import { Button, Stack } from "@mui/material"
import React, { useState } from "react"
import type { DemoProps } from "../../docs/demos/stackblitzGenerators"
import {
    createStackblitzDemo,
    DEMO_ELEMENT_ID
} from "../../docs/demos/stackblitzGenerators"

export const ToggleableDemo = (props: DemoProps) => {
    const { pathname } = useLocation()
    const [isActive, setIsActive] = useState<boolean>(pathname.includes("try"))
    const [isLoading, setIsLoading] = useState(true)
    return (
        <>
            <Stack
                alignItems="center"
                spacing={2}
                width="100%"
                sx={{ position: "relative" }}
            >
                <Button
                    color="info"
                    variant="contained"
                    sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        whiteSpace: "nowrap"
                    }}
                    onClick={async () => {
                        if (!isActive) {
                            await activateDemo(props)
                            setIsLoading(false)
                        }
                        setIsActive(!isActive)
                    }}
                    endIcon={
                        <div style={{ display: "flex" }}>
                            <Terminal />
                            {isActive ? <Collapse /> : <Expand />}
                        </div>
                    }
                >
                    {isActive ? "All done?" : "Take control"}
                </Button>
                <Stack>
                    <div id={DEMO_ELEMENT_ID} />
                    {isActive ? null : (
                        <video
                            autoPlay
                            loop
                            muted
                            src="/img/arktype.mp4"
                            style={{ width: "100%" }}
                        />
                    )}
                </Stack>
            </Stack>
        </>
    )
}

const activateDemo = async (props: DemoProps) => {
    const vm = await createStackblitzDemo(props)
    // hack to workaround a caching issue where tsconfig is not applied until it is modified
    setTimeout(
        () =>
            vm.applyFsDiff({
                create: {
                    "tsconfig.json": JSON.stringify(
                        {
                            compilerOptions: {
                                module: "esnext",
                                target: "esnext",
                                strict: true
                            }
                        },
                        null,
                        4
                    )
                },
                destroy: []
            }),
        5000
    )
}
