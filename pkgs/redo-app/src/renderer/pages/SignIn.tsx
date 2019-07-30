import React, { useEffect } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { FormText, FormSubmit, Column, CardPage } from "redo-components"
import { SecondarySignUpButton, SignInOrUp } from "custom"
import { component } from "blocks"
import { SignInSubmit } from "gql"
import { SignInInput } from "redo-model"
import { motion, AnimatePresence } from "framer-motion"
import Logo from "assets/logo.svg"

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
<<<<<<< HEAD
                <img src={logo} />
                <SignInOrUp>
=======
                <Logo />
                <Form validateAgainst={new SignInInput()}>
>>>>>>> master
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
                                    <FormText name="email" />
                                    <FormText name="password" />
                                </Column>
                            </motion.div>
                        </AnimatePresence>
                    </Column>
                    <FormSubmit>Sign in</FormSubmit>
                </SignInOrUp>
            </CardPage>
            <SecondarySignUpButton text="Need an account?" />
        </Column>
    )
})
