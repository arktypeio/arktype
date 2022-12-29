import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import Terminal from "@mui/icons-material/Terminal"
import { Button, Stack, Typography } from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import React, { useRef, useState } from "react"
import { StackBlitzDemo } from "../../docs/demos/index"

export const Demo = () => {
    const [activeDemo, setActiveDemo] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const ref = useRef<null | HTMLSpanElement>(null)
    return (
        <Stack
            spacing={2}
            direction="column"
            justifyContent="center"
            position="relative"
        >
            <Typography component="h4" variant="h2" align="center">
                Experience Greatness!
            </Typography>
            <Typography component="p" align="center">
                Don't just take our word for it, experience it yourself!
            </Typography>
            <HomepageDemo
                setActiveDemo={setActiveDemo}
                setLoading={setLoading}
                activeDemo={activeDemo}
                demoElement={<StackBlitzDemo embedId="type" />}
                demoRef={ref}
                sx={{ margin: "0 auto", width: "100%", position: "relative" }}
            />
            {loading && (
                <CircularProgress
                    color="secondary"
                    sx={{
                        position: "absolute",
                        left: "49%",
                        top: "49%"
                    }}
                />
            )}
            <span ref={ref} style={{ opacity: loading ? 0 : 100 }}>
                {activeDemo}
            </span>
        </Stack>
    )
}
const HomepageDemo = (props: any) => {
    return (
        <Button
            color={props.buttonColor}
            variant="contained"
            sx={{ whiteSpace: "nowrap" }}
            onClick={() => {
                setTimeout(() => {
                    props.setLoading(false)
                }, 3000)
                props.setLoading(props.activeDemo ? false : true)
                props.setActiveDemo(
                    props.activeDemo ? null : props.demoElement!
                )
                !props.activeDemo &&
                    setTimeout(() => {
                        props.demoRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "end"
                        })
                    }, 1)
            }}
            endIcon={
                <div style={{ display: "flex" }}>
                    <Terminal />
                    {props.activeDemo ? <Collapse /> : <Expand />}
                </div>
            }
        >
            {props.activeDemo ? "All done?" : "Try it here!"}
        </Button>
    )
}
