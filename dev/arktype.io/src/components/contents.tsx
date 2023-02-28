import { Stack } from "@mui/material"
import React from "react"
import { Features } from "../components/features.tsx"
import { HomeDemo } from "./homeDemo.tsx"
import {
    FloatingInstallationBlock,
    MobileInstallationBlock
} from "./installationBlock.tsx"
import { useInstallationBlockShouldFloat } from "./useWindowSize.ts"

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
                <HomeDemo />
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
