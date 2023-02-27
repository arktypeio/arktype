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
import { cascadiaCodeFamily } from "."

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
                    variant="contained"
                    sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        margin: "1rem",
                        whiteSpace: "nowrap",
                        backgroundColor: "#ffffff00",
                        backdropFilter: "blur(2px)",
                        borderRadius: "2rem",
                        fontSize: "1.5rem",
                        fontFamily: cascadiaCodeFamily,
                        textTransform: "none"
                    }}
                    onClick={async () => {
                        setIsActive(!isActive)
                        if (!isActive) {
                            await activateDemo(props)
                            setIsLoading(false)
                        }
                    }}
                    endIcon={
                        <div style={{ display: "flex" }}>
                            <Terminal />
                            {isActive ? <Collapse /> : <Expand />}
                        </div>
                    }
                >
                    {isActive ? "All done?" : "Take control of this demo"}
                </Button>
                <Stack width="100%">
                    <div
                        style={{
                            width: "100%",
                            height: "600px",
                            display: isActive ? "flex" : "none"
                        }}
                    >
                        <div id={DEMO_ELEMENT_ID} />
                    </div>
                    <video
                        style={{
                            width: "100%",
                            display: isActive ? "none" : "unset"
                        }}
                        autoPlay
                        loop
                        muted
                        src="/img/arktype.mp4"
                    />
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
