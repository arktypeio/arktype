import React from "react"
import { Column, Card, Button, useTheme } from "@re-do/components"
import { motion, AnimatePresence } from "framer-motion"
import Logo from "assets/logo.svg"
import { store } from "renderer/common"
import { Page } from "renderer/state"
import { SignIn } from "./SignIn"
import { SignUp } from "./SignUp"

export type LandingProps = {
    page: Page.SignIn | Page.SignUp
}

export const Landing = ({ page }: LandingProps) => {
    const theme = useTheme()
    const isSignIn = page === Page.SignIn
    return (
        <Column full justify="center" align="center">
            <Card
                style={{
                    width: theme.spacing(45),
                    height: theme.spacing(50),
                    padding: `${theme.spacing(3)}px ${theme.spacing(5)}px`
                }}
            >
                <Column full>
                    <Logo />
                    <Column grow align="center">
                        {isSignIn ? (
                            <SlideInAndOut>
                                <SignIn />
                            </SlideInAndOut>
                        ) : (
                            <SlideInAndOut>
                                <SignUp />
                            </SlideInAndOut>
                        )}
                    </Column>
                </Column>
            </Card>
            <Button
                style={{
                    marginTop: theme.spacing(1)
                }}
                kind="secondary"
                onClick={() =>
                    store.mutate({ page: isSignIn ? Page.SignUp : Page.SignIn })
                }
            >
                {isSignIn ? "Need an account?" : "Back to sign in"}
            </Button>
        </Column>
    )
}

export type SlideInAndOutProps = {
    children: JSX.Element
}

export const SlideInAndOut = ({ children }: SlideInAndOutProps) => (
    <AnimatePresence>
        <motion.div
            positionTransition
            initial={{
                x: -500
            }}
            animate={{ x: 0 }}
            exit={{ x: -500 }}
            style={{
                width: "100%",
                height: "100%"
            }}
        >
            {children}
        </motion.div>
    </AnimatePresence>
)
