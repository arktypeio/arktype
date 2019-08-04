import React, { FC } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import {
    FormText,
    FormSubmit,
    Column,
    CardPage,
    Form,
    Fields,
    ResponseState,
    FormErrors
} from "redo-components"
import { SecondarySignUpButton } from "custom"
import { component } from "blocks"
import gql from "graphql-tag"
import { SignInInput } from "redo-model"
import { motion, AnimatePresence } from "framer-motion"
import Logo from "assets/logo.svg"
import { plainToClassFromExist } from "class-transformer"
import { validateSync } from "class-validator"
import { useMutation } from "@apollo/react-hooks"

import { store } from "renderer/common"
import { createValidator, UseMutation, submitForm } from "custom/CustomForm"

const stylize = makeStyles((theme: Theme) => ({
    animatedFields: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-around"
    }
}))

const SIGNIN = gql`
    mutation signIn($email: String!, $password: String!) {
        signIn(email: $email, password: $password) {
            token
        }
    }
`

type SignInData = {
    signIn: {
        token: string
    }
}

const validate = createValidator(new SignInInput())

export const SignIn: FC = () => {
    const [submit] = useMutation<SignInData, SignInInput>(SIGNIN)
    const { animatedFields } = stylize()
    return (
        <Column align="center" justify="center">
            <CardPage>
                <Logo />
                <Form<SignInInput, SignInData>
                    submit={async fields => {
                        const result = await submitForm({ submit, fields })
                        if (result.data && result.data.signIn) {
                            store.mutate({ token: result.data.signIn.token })
                        }
                        return result
                    }}
                    validate={validate}
                >
                    <Column grow>
                        <AnimatePresence>
                            <motion.div
                                positionTransition
                                initial={{
                                    x: -500
                                }}
                                animate={{ x: 0 }}
                                exit={{ x: -500 }}
                                className={animatedFields}
                            >
                                <Column>
                                    <FormText name="email" autoFocus />
                                    <FormText type="password" name="password" />
                                </Column>
                            </motion.div>
                        </AnimatePresence>
                    </Column>
                    <FormSubmit
                        responseOptions={{
                            loading: { hideContent: true }
                        }}
                    >
                        Sign in
                    </FormSubmit>
                </Form>
            </CardPage>
            <SecondarySignUpButton>Need an account?</SecondarySignUpButton>
        </Column>
    )
}
