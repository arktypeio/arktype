import { InputType, ArgsType, Field, ObjectType } from "type-graphql"
import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    IsNotEmpty,
    IsEmail
} from "class-validator"
export { ID, ObjectType } from "type-graphql"
import { Class } from "redo-utils"

export const Matches = <T extends Record<string, any>>(
    other: keyof T,
    validationOptions?: ValidationOptions
) => (target: T, key: keyof T) =>
    registerDecorator({
        name: "matches",
        target: target.constructor,
        propertyName: key as string,
        constraints: [other],
        options: validationOptions,
        validator: {
            validate(value: any, args: ValidationArguments) {
                const obj = args.object as T
                const matchingPropKey = args.constraints[0] as keyof T
                return value === obj[matchingPropKey]
            }
        }
    })

type ValidationDecorator = (
    ...args: any[]
) => (target: object, key: string) => any

type DefaultValidator<T extends ValidationDecorator> = {
    underlying: T
    args: Parameters<T>
}

const createValidator = <T extends ValidationDecorator>(
    options: DefaultValidator<T>
) => (target: object, key: string) => {
    const { underlying, args } = options
    underlying(...args)(target, key)
}

class ValidatorMap {
    constructor(private target: object, private key: string) {}

    email = () =>
        createValidator({
            underlying: IsEmail,
            args: [{}, { message: "That doesn't look like a valid email" }]
        })

    filled = () =>
        createValidator({
            underlying: IsNotEmpty,
            args: [{ message: `${this.key} is required` }]
        })

    matches = (other: string) =>
        createValidator({
            underlying: Matches,
            args: [other, { message: "That didn't match" }]
        })
}

export type ValidateArg =
    | keyof ValidatorMap
    | { [K in keyof ValidatorMap]?: Parameters<ValidatorMap[K]>[0] }

export type InArgs<S extends boolean> = {
    validate?: ValidateArg[]
    submitted?: S
} & (S extends false ? {} : FieldArgs)

export const InField = <F extends boolean>(
    { submitted, validate = [], ...fieldArgs }: InArgs<F> = {} as any
) => (target: object, key: string) => {
    const validatorMap = new ValidatorMap(target, key)
    if (submitted !== false) {
        decorateField({
            target,
            key,
            ...(fieldArgs as any)
        })
    }
    // TODO: Fix types here (need a better strategy to determine whether we need to pass in arguments)
    validate.forEach(validator =>
        typeof validator === "string"
            ? (validatorMap[validator] as any)()(target, key)
            : Object.entries(validator).forEach(([key, validateArgs]) =>
                  (validatorMap[key as keyof ValidatorMap] as any)(
                      validateArgs
                  )(target, key)
              )
    )
}

export type PropDecoratorArgs = {
    target: object
    key: string
}

export type FieldArgs = {
    type?: Parameters<typeof Field>[0]
    options?: Parameters<typeof Field>[1]
}

export type DecorateFieldArgs = PropDecoratorArgs & FieldArgs

export const decorateField = ({
    type,
    options,
    target,
    key
}: DecorateFieldArgs) => {
    if (type && options) {
        Field(type, options)(target, key)
    } else if (!type && !options) {
        Field()(target, key)
    } else {
        // type-graphql type for Field is incorrect; it does accept options as a single parameter
        Field(type ? type : (options as any))(target, key)
    }
}

export const InType = () => (target: any) => {
    ObjectType(`LocalOnly${target.name}`)(target)
    InputType()(target)
    ArgsType()(target)
}

export const OutType = () => (target: any) => {
    ObjectType()(target)
}

export type OutArgs = {
    schemaSuffix?: string
} & FieldArgs

export const OutField = ({ schemaSuffix, type, options }: OutArgs = {}) => (
    target: object,
    key: string
) =>
    decorateField({
        type,
        options: schemaSuffix
            ? { ...options, description: schemaSuffix }
            : options,
        target,
        key
    })

export type TypeMetadata = {
    gql: Record<string, string>
    actions: TypeAction[]
    inType: Class<any>
    outType: Class<any>
}

export enum TypeAction {
    Create = "CREATE",
    Delete = "DELETE",
    Update = "UPDATE",
    Run = "RUN"
}
