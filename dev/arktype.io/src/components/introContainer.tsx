import { Box, Stack, Typography } from "@mui/material"
import React from "react"

export const IntroContainer = () => {
    return (
        <Stack
            sx={{
                display: "inline-flex",
                alignContent: "space-between",
                flexDirection: "row",
                width: "100%",
                height: "100%",
                marginTop: "2em"
            }}
            id="introContainer"
        >
            <Box sx={{ width: "40%", padding: "5px" }}>
                <Typography component="h2" variant="h3" align="center">
                    1:1 Isomorphic
                    <br /> EZ MOOCHI
                </Typography>
                <Typography
                    align="center"
                    id="introText"
                    marginBottom={2}
                    fontSize="18px"
                >
                    Arktype makes it quick and easy to validate your types.
                    Whether you are an experienced TypeScript developer or just
                    starting out, Arktype allows you to easily check the
                    accuracy and consistency of your data using a familiar
                    TypeScript-like structure. With Arktype, you can confidently
                    ensure that your data is accurate and reliable.
                    <a href="https://arktype.io/type/"> Learn more. </a>
                </Typography>
            </Box>
            <Box
                sx={{
                    width: "60%",
                    display: "flex",
                    justifyContent: "right"
                }}
                id="introGif"
            >
                <img src="https://via.placeholder.com/800x400?text=Arktype.io+is+super+POOGERS" />
            </Box>
        </Stack>
    )
}
