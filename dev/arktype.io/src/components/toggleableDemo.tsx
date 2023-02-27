import { useLocation } from "@docusaurus/router"
import { useColorMode } from "@docusaurus/theme-common"
import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import { Button, Stack, useMediaQuery, useTheme } from "@mui/material"
import { motion } from "framer-motion"
import React, { useState } from "react"
import type { DemoProps } from "../../docs/demos/stackblitzGenerators"
import {
    createStackblitzDemo,
    DEMO_ELEMENT_ID
} from "../../docs/demos/stackblitzGenerators"
import { cascadiaCodeFamily } from "."

export const ToggleableDemo = (props: DemoProps) => {
    const { pathname } = useLocation()
    const palette = useTheme().palette
    const isDarkMode = useColorMode().colorMode === "dark"
    const [isActive, setIsActive] = useState<boolean>(pathname.includes("try"))
    const [isLoading, setIsLoading] = useState(true)
    const backgroundColor = isDarkMode ? "#ffffff00" : "#000000aa"
    return (
        <Stack alignItems="start" width="100%">
            <Button
                variant="contained"
                sx={{
                    backgroundColor,
                    backdropFilter: "blur(2px)",
                    borderRadius: "2rem",
                    fontSize: "1.5rem",
                    fontFamily: cascadiaCodeFamily,
                    textTransform: "none",
                    color: palette.primary.light,
                    "&:hover": {
                        backgroundColor,
                        color: palette.primary.main
                    }
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
                        {isActive ? <Collapse /> : <Expand />}
                    </div>
                }
            >
                {isActive ? "$ wq!" : "$ sudo chmod +wx demo.ts"}
                <motion.div
                    animate={{ opacity: 0 }}
                    transition={{
                        duration: 0.5,
                        repeatType: "mirror",
                        repeat: Infinity
                    }}
                >
                    _
                </motion.div>
            </Button>
            <Stack width="100%">
                <div
                    style={{
                        width: "100%",
                        height: "600px",
                        display: isActive ? "flex" : "none",
                        marginTop: "1rem"
                    }}
                >
                    <div id={DEMO_ELEMENT_ID} />
                </div>
                <video
                    style={{
                        width: "100%",
                        display: isActive ? "none" : "unset",
                        marginTop: "-1.8rem"
                    }}
                    autoPlay
                    loop
                    muted
                    src="/img/arktype.mp4"
                />
            </Stack>
        </Stack>
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
