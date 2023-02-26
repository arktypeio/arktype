import useIsBrowser from "@docusaurus/useIsBrowser"
import { Stack, Typography } from "@mui/material"
import React from "react"
import { Boat } from "../components/boat"
import { LogoCloud } from "../components/logoCloud"
import { FloatingInstallationBlock } from "./installationBlock"
import { useIsMobile } from "./useWindowSize"

export const Header = ({ title, tagline }: Record<string, string>) => {
    return (
        <header
            style={{
                height: "10rem",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <LogoCloud names={["typescript", "vscode", "intellij", "vim"]} />
            <Stack flexGrow={1}>
                <Typography component="h1" variant="h2" color="secondary">
                    {title}
                </Typography>
                <Typography
                    component="h2"
                    variant={
                        useIsBrowser() && window.screen.width < 1000
                            ? "h6"
                            : "h5"
                    }
                    color="common.white"
                    style={{
                        whiteSpace: "nowrap"
                    }}
                >
                    {tagline}
                </Typography>
            </Stack>
            <LogoCloud names={["javascript", "chromium", "node", "deno"]} />
            {useIsMobile() ? null : <FloatingInstallationBlock />}
            <Boat />
        </header>
    )
}
