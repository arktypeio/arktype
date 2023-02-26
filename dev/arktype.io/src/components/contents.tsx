import { Stack } from "@mui/material"
import React from "react"
import { Features } from "../components/features"
import { ToggleableDemo } from "../components/toggleableDemo"

export const Contents = () => {
    return (
        <main style={{ display: "flex", justifyContent: "center" }}>
            <Stack
                justifyContent="center"
                alignItems="center"
                spacing={1}
                padding={2}
                width="100%"
                maxWidth="1600px"
            >
                <video
                    autoPlay
                    loop
                    muted
                    style={{
                        maxWidth: "60em",
                        width: "100%",
                        borderRadius: "1rem",
                        zIndex: -2
                    }}
                    src="/img/arktype.mp4"
                />
                <Features />
                <ToggleableDemo embedId="type" />
            </Stack>
        </main>
    )
}
