import { print } from "graphql/language/printer"
import gql from "graphql-tag"

const contents = gql`
    mutation signUp {
        signUp(
            data: {
                email: "reed@redo.qa"
                password: "redo"
                first: "Reed"
                last: "Doe"
            }
        )
    }

    mutation signIn {
        signIn(data: { email: "oder@redo.qa", password: "redo" })
    }

    query users {
        users {
            email
        }
    }

    mutation createStep {
        createOneStep(
            data: {
                action: "click"
                value: ""
                selector: { create: { css: "#id" } }
            }
        ) {
            id
        }
    }

    query steps {
        steps {
            action
            value
            selector {
                css
            }
        }
    }
`

export const playground = {
    tabs: [
        {
            endpoint: `http://localhost:${process.env.PORT}`,
            query: print(contents)
        }
    ]
}
