import { Stack } from "@mui/material"
import React from "react"
import { Features } from "../components/features"
import {
    FloatingInstallationBlock,
    MobileInstallationBlock
} from "./installationBlock"
import { SudoDemo } from "./sudoDemo"
import { useInstallationBlockShouldFloat } from "./useWindowSize"

export const Contents = () => {
    return (
        <main style={{ display: "flex", justifyContent: "center" }}>
            <Stack
                justifyContent="center"
                alignItems="center"
                padding="1rem 0rem 1rem"
                spacing={1}
                width="100%"
                maxWidth="60rem"
            >
                <SudoDemo />
                {useInstallationBlockShouldFloat() ? (
                    <FloatingInstallationBlock />
                ) : (
                    <MobileInstallationBlock />
                )}
                <Features />
            </Stack>
        </main>
    )
}
