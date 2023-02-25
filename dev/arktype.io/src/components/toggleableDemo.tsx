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
        <Stack alignItems="center" spacing={2} width="100%">
            <Button
                color="info"
                variant="contained"
                sx={{ whiteSpace: "nowrap", maxWidth: "13rem" }}
                onClick={() => {
                    setIsActive(!isActive)
                }}
                endIcon={
                    <div style={{ display: "flex" }}>
                        <Terminal />
                        {isActive ? <Collapse /> : <Expand />}
                    </div>
                }
            >
                {isActive ? "All done?" : "Try in-browser"}
            </Button>
            {isActive ? <StackBlitzDemo embedId={embedId} /> : null}
        </Stack>
    )
}
