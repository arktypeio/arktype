import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import Terminal from "@mui/icons-material/Terminal"
import { Button, Stack } from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import React, { useRef, useState } from "react"
import { StackBlitzDemo } from "../../docs/demos/index"

export const Demo = () => {
    const [activeDemo, setActiveDemo] = useState<null | JSX.Element>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const ref = useRef<null | HTMLSpanElement>(null)
    return (
        <Stack spacing={2}>
            <HomepageDemo
                buttonColor="info"
                activeDemo={activeDemo}
                setActiveDemo={setActiveDemo}
                setLoading={setLoading}
                demoElement={<StackBlitzDemo embedId="type" />}
                demoRef={ref}
            />
            {loading && (
                <Stack direction="row" justifyContent="center">
                    <CircularProgress color="secondary" />
                </Stack>
            )}
            <span ref={ref} style={{ opacity: loading ? 0 : 100 }}>
                {activeDemo}
            </span>
        </Stack>
    )
}

type HomepageDemoProps = {
    buttonColor: "info"
    activeDemo: JSX.Element | null
    demoElement: JSX.Element
    setActiveDemo: (demo: JSX.Element | null) => void
    setLoading: (isLoading: boolean) => void
    demoRef: React.MutableRefObject<null | HTMLSpanElement>
}

const HomepageDemo = (props: HomepageDemoProps) => {
    return (
        <Stack direction="row" justifyContent="center" sx={{ margin: "1em" }}>
            <Button
                color={props.buttonColor}
                variant="contained"
                sx={{ whiteSpace: "nowrap" }}
                onClick={() => {
                    setTimeout(() => {
                        props.setLoading(false)
                    }, 1000)
                    props.setLoading(props.activeDemo ? false : true)
                    props.setActiveDemo(
                        props.activeDemo ? null : props.demoElement
                    )
                    !props.demoElement &&
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
        </Stack>
    )
}
