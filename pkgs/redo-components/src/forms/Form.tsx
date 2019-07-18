import React from "react"
import { Theme } from "@material-ui/core/styles"
import { createStyles } from "@material-ui/styles"
import { Formik } from "formik"
import { component } from "blocks"
import { listify } from "redo-utils"
import { validateSync } from "class-validator"
import { plainToClassFromExist } from "class-transformer"

const styles = (theme: Theme) => createStyles({})

const InitialValueMap: Record<string, any> = {
    FormText: ""
}

export type FormProps = {
    // Should be a class representing input fields and optionally including 'class-validator' decorators
    validateAgainst: any
}

type PossiblyTypedReactElement = JSX.Element & {
    type: { displayName?: string; name?: string }
}

type PossiblyTypedReactNode = PossiblyTypedReactElement | void

const getName = (node: PossiblyTypedReactNode) => {
    let name = "?"
    if (node && node.type) {
        const nodeName = node.type.displayName || node.type.name
        name = nodeName ? nodeName : name
    }
    return name
}

const findNamedDescendents = (
    node: PossiblyTypedReactNode,
    names: string[]
) => {
    if (!node) return []
    const matches: PossiblyTypedReactElement[] = []
    const children = listify(node.props ? node.props.children : [])
    if (node.type) {
        const name = getName(node)
        if (names.includes(name)) {
            matches.push(node)
        }
    }
    children.forEach(child => {
        matches.push(...findNamedDescendents(child, names))
    })
    return matches
}

export const Form = component({
    name: "Form",
    defaultProps: {} as FormProps,
    styles
})(({ children, validateAgainst }) => {
    const layout = listify(children)
    const fields = layout.flatMap(child =>
        findNamedDescendents(
            child as PossiblyTypedReactNode,
            Object.keys(InitialValueMap)
        )
    )
    const initialValues = fields.reduce(
        (values, child) => {
            const name = getName(child)
            if (name in InitialValueMap) {
                values[child.props.holds] = InitialValueMap[name]
            }
            return values
        },
        {} as Record<string, any>
    )
    const validate = createValidator(validateAgainst)
    return (
        <Formik
            initialValues={initialValues}
            onSubmit={() => {}}
            validate={validate}
        >
            {children}
        </Formik>
    )
})

const createValidator = (against: any) => (values: Record<string, any>) => {
    // Translate class-validator style errors to the format expected by formik
    const classValidatorErrors = validateSync(
        plainToClassFromExist(against, values)
    )
    return classValidatorErrors.reduce(
        (errors, current) => {
            return {
                ...errors,
                ...{
                    ...{
                        [current.property]: Object.values(
                            current.constraints
                        ).join("\n")
                    }
                }
            }
        },
        {} as Record<string, any>
    )
}
