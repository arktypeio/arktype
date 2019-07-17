import React, { useEffect } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Form, FormText, Column, CardPage } from "blocks"
import { SecondarySignUpButton } from "custom"
import { component } from "blocks"
import { SignInSubmit } from "gql"
import { SignInInput } from "redo-model"
import { motion, AnimatePresence } from "framer-motion"
import logo from "assets/logo.svg"

const stylize = makeStyles((theme: Theme) => ({
    fields: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-around"
    }
}))

export const SignIn = component({})(() => {
    const { fields } = stylize()
    return (
        <Column align="center" justify="center">
            <CardPage>
                <img src={logo} />
                <Form validateAgainst={new SignInInput()}>
                    <Column grow>
                        <AnimatePresence>
                            <motion.div
                                positionTransition
                                initial={{
                                    x: -500
                                }}
                                animate={{ x: 0 }}
                                exit={{ x: -500 }}
                                className={fields}
                            >
                                <Column>
                                    <FormText holds="email" autoFocus />
                                    <FormText
                                        holds="password"
                                        type="password"
                                    />
                                </Column>
                            </motion.div>
                        </AnimatePresence>
                        <SignInSubmit />
                    </Column>
                </Form>
            </CardPage>
            <SecondarySignUpButton text="Need an account?" />
        </Column>
    )
})
