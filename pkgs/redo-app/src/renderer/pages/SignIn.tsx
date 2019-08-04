import React, { FC } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles, useTheme } from "@material-ui/styles"
import {
    FormText,
    FormSubmit,
    Column,
    Card,
    Form,
    SecondaryButton
} from "redo-components"
import gql from "graphql-tag"
import { SignInInput } from "redo-model"
import { motion, AnimatePresence } from "framer-motion"
import Logo from "assets/logo.svg"
import { useMutation } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { createValidator, submitForm } from "custom/CustomForm"
import { Page } from "renderer/state"

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
    const theme = useTheme<Theme>()
    return (
        <Column css={{ justifyContent: "center", alignItems: "center" }}>
            <Card
                css={{
                    width: theme.spacing(45),
                    height: theme.spacing(50),
                    padding: `${theme.spacing(3)}px ${theme.spacing(5)}px`
                }}
            >
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
                    <Column css={{ flexGrow: 1 }}>
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
            </Card>
            <SecondaryButton
                onClick={() => store.mutate({ page: Page.SignUp })}
            >
                Need an account?
            </SecondaryButton>
        </Column>
    )
}
