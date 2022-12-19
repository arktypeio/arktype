import { Box, Container, Stack, ThemeProvider, Typography } from "@mui/material"
import React from "react"

export const IntroContainer = () => {
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignContent: "space-between",
                flexDirection: "row",
                width: "100%",
                height: "100%"
            }}
            id="introContainer"
        >
            <Box sx={{ width: "30%", padding: "5px" }}>
                <Typography
                    component="h2"
                    variant="h3"
                    color="secondary"
                    align="center"
                >
                    1:1 Isomorphic
                    <br /> EZ MOOCHI
                </Typography>
                <Typography align="center" id="introText">
                    A nice little blurb about how quick and easy you can start
                    working with that links to{" "}
                    <a href="https://arktype.io/type/">Tutorial</a>
                </Typography>
            </Box>
            <Box
                sx={{
                    width: "70%",
                    display: "flex",
                    justifyContent: "right"
                }}
                id="introGif"
            >
                <img src="https://via.placeholder.com/800x400?text=Arktype.io+is+super+POOGERS" />
            </Box>
        </Box>
    )
}
