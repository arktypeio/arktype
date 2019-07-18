import React from "react"
import {
    withStyles,
    WithTheme
} from "@material-ui/styles"
import { StyleRulesCallback, WithStyles, StyleRules } from "@material-ui/styles/withStyles"
import { Grid, Theme } from "@material-ui/core"
import { GridProps as MuiGridProps } from "@material-ui/core/Grid"
import { store as rootStore } from "renderer/common"
import { connect, FormikProps } from "formik"
import { withApollo, graphql, DataProps } from "react-apollo"
import { ApolloClient } from "apollo-boost"
import { Root } from "state"
import { Query, shapeql } from "shapeql"

export type Variables = Record<string, any>
export type Value = NonNullable<any>

export type Styles<P extends object> =
    | StyleRules<P>
    | StyleRulesCallback<Theme, P>

type StyleProps<P extends object, S extends Styles<P>> = WithStyles<S> &
    WithTheme<Theme>

export type GridProps = { grid?: InnerGridProps }

type InnerGridProps = MuiGridProps

const defaultGridProps: InnerGridProps = {
    item: true
}

type FormProps<F> = { formik: FormikProps<F> }

export const withGrid = (C: React.ComponentType<any>) => ({
    grid = defaultGridProps,
    ...other
}) => {
    const gridProps = Object.assign({ ...defaultGridProps }, grid)
    return (
        <Grid {...gridProps}>
            <C {...other} />
        </Grid>
    )
}

export const withStore = (C: React.ComponentType<any>) => (props: any) => {
    return <C store={rootStore} {...props} />
}

export interface ComponentArgs<
    PropType,
    StyleType,
    GriddedType,
    VariableType,
    DataType,
    FormType,
    ApolloType,
    StoreType,
    QueryType
> {
    name?: string
    defaultProps?: Partial<PropType>
    gridded?: GriddedType
    styles?: StyleType
    defaultVariables?: Partial<VariableType>
    returnedData?: Partial<DataType>
    form?: FormType
    apollo?: ApolloType
    store?: StoreType
    query?: QueryType
}

export const component = <
    PropType extends object,
    StyleType extends Styles<PropType> | undefined = undefined,
    GriddedType extends boolean | undefined = undefined,
    VariableType extends Variables | undefined = undefined,
    DataType extends Value | undefined = undefined,
    FormType extends boolean | undefined = undefined,
    ApolloType extends boolean | undefined = undefined,
    StoreType extends boolean | undefined = undefined,
    QueryType extends Query<Root> | undefined = undefined
>({
    name,
    defaultProps,
    gridded,
    styles,
    form,
    apollo,
    store,
    query
}: ComponentArgs<
    PropType,
    StyleType,
    GriddedType,
    VariableType,
    DataType,
    FormType,
    ApolloType,
    StoreType,
    QueryType
>) => (
    C: React.ComponentType<
        Omit<
            PropType &
                (StyleType extends Styles<PropType>
                    ? StyleProps<PropType, StyleType>
                    : {}) &
                (FormType extends true ? FormProps<VariableType> : {}) &
                (ApolloType extends true ? { client: ApolloClient<any> } : {}) &
                (StoreType extends true ? { store: typeof rootStore } : {}) &
                (QueryType extends Query<Root>
                    ? DataProps<
                          Pick<Root, Extract<keyof QueryType, keyof Root>>
                      >
                    : {}),
            GriddedType extends true ? keyof GridProps : ""
        >
    >
): React.ComponentType<PropType> => {
    let T: any = C
    if (styles) {
        T = withStyles(styles!, {
            withTheme: true
        })(T)
    }
    if (gridded) {
        T = withGrid(T)
    }
    if (form) {
        T = connect<PropType, VariableType>(T)
    }
    if (store) {
        T = withStore(T)
    }
    if (apollo || store) {
        T = withApollo<PropType>(T)
    }
    if (query) {
        T = graphql(shapeql(Root)(query!))(T)
    }
    if (name) {
        T.displayName = name
    }
    if (defaultProps) {
        T.defaultProps = defaultProps
    }
    return T
}
