import { Stack, Typography } from "@mui/material"
import React from "react"
import { Boat } from "../components/boat.tsx"
import { LogoCloud } from "../components/logoCloud.tsx"
import { useIsMobile } from "./useWindowSize.ts"

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
            {useIsMobile() ? null : (
                <LogoCloud
                    names={["typescript", "vscode", "intellij", "vim"]}
                />
            )}
            <Stack flexGrow={1}>
                <Typography component="h1" variant="h2" color="secondary">
                    {title}
                </Typography>
                <Typography
                    component="h2"
                    variant="h5"
                    color="common.white"
                    // style={{
                    //     fontSize: useIsMobile() ? "1rem" : "unset"
                    // }}
                >
                    {tagline}
                </Typography>
            </Stack>
            {useIsMobile() ? null : (
                <LogoCloud names={["javascript", "chromium", "node", "deno"]} />
            )}
            <Boat />
        </header>
    )
}
