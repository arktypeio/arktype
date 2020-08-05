import React, { useState } from "react"
import { Fab, SvgIcon } from "@material-ui/core"
import { Button, Icons } from "@re-do/components"
import {
    motion,
    useAnimation,
    MotionValue,
    useViewportScroll,
    useTransform
} from "framer-motion"
import { SignUpDialog } from "../signUp/SignUp"

import { layout } from "../constants"

const wiggle = {
    rotate: [0, -2, 2, -2, 2, 0],
    transition: {
        duration: 0.4
    }
}
const initialWiggle = {
    ...wiggle,
    transition: {
        ...wiggle.transition,
        delay: 2.2
    }
}
const loopedWiggle = {
    ...wiggle,
    transition: {
        ...wiggle.transition,
        loop: Infinity,
        repeatDelay: 0.7
    }
}

export type GetStartedButtonProps = {
    mobile: boolean
}

export const GetStartedButton = ({ mobile }: GetStartedButtonProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    return (
        <>
            {mobile ? (
                <MobileGetStartedButton onClick={() => setDialogOpen(true)} />
            ) : (
                <DesktopGetStartedButton onClick={() => setDialogOpen(true)} />
            )}
            <SignUpDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />
        </>
    )
}

type InnerProps = {
    onClick: () => void
}

const DesktopGetStartedButton = ({ onClick }: InnerProps) => {
    const { scrollY } = useViewportScroll()
    const controls = useAnimation()
    const scrollRange = [0, layout.header.height]
    const offsetRange = [layout.header.height + 32, 8]
    const colorRange = ["#ffffff", "#2979ff"]
    const getStartedOffset = useTransform(scrollY, scrollRange, offsetRange)
    const getStartedColor = useTransform(scrollY, scrollRange, colorRange)
    return (
        <motion.div animate={initialWiggle}>
            <motion.div
                animate={controls}
                onHoverStart={() => controls.start(loopedWiggle)}
                onHoverEnd={() => controls.stop()}
            >
                <motion.div
                    style={{
                        position: "fixed",
                        height: layout.header.height,
                        top: getStartedOffset,
                        color: getStartedColor,
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        zIndex: 1
                    }}
                >
                    <Button
                        kind="secondary"
                        style={{
                            color: "inherit",
                            borderColor: "inherit",
                            fontWeight: 700
                        }}
                        fontSize={18}
                        onClick={onClick}
                    >
                        Get Started
                    </Button>
                </motion.div>
            </motion.div>
        </motion.div>
    )
}

const MobileGetStartedButton = ({ onClick }: InnerProps) => {
    return (
        <motion.div
            animate={initialWiggle}
            style={{
                position: "fixed",
                top: layout.header.height + 8,
                right: 8,
                zIndex: 2
            }}
        >
            <Fab
                size="medium"
                variant="extended"
                color="secondary"
                onClick={onClick}
                style={{
                    zIndex: 2
                }}
            >
                <Icons.code style={{ marginRight: 8 }} />
                Get Started
            </Fab>
        </motion.div>
    )
}
