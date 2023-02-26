import { useLocation } from "@docusaurus/router"
import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import Terminal from "@mui/icons-material/Terminal"
import { Button, Stack } from "@mui/material"
import React, { useState } from "react"
import { StackBlitzDemo } from "../../docs/demos/index"
import type { EmbedId } from "../../docs/demos/stackblitzGenerators"

export type ToggleableDemoProps = {
    embedId: EmbedId
}

export const ToggleableDemo = ({ embedId }: ToggleableDemoProps) => {
    const { pathname } = useLocation()
    const [isActive, setIsActive] = useState<boolean>(pathname.includes("try"))
    return (
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
                onClick={() => setIsActive(!isActive)}
                endIcon={
                    <div style={{ display: "flex" }}>
                        <Terminal />
                        {isActive ? <Collapse /> : <Expand />}
                    </div>
                }
            >
                {isActive ? "All done?" : "Take control"}
            </Button>
            {isActive ? (
                <StackBlitzDemo embedId={embedId} />
            ) : (
                <DemoVideo src="/img/arktype.mp4" />
            )}
        </Stack>
    )
}

type DemoVideoProps = {
    src: string
}

const DemoVideo = ({ src }: DemoVideoProps) => (
    <video
        autoPlay
        loop
        muted
        style={{
            width: "100%",
            borderRadius: "1rem",
            zIndex: -2
        }}
        src={src}
    />
)
