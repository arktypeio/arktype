/* Common Schema Parsing Errors */
export type writeJsonSchemaCommonConstAndEnumMessage =
	"Provided JSON Schema cannot have both 'const' and 'enum' keywords."
export const writeJsonSchemaCommonConstAndEnumMessage =
	(): writeJsonSchemaCommonConstAndEnumMessage =>
		"Provided JSON Schema cannot have both 'const' and 'enum' keywords."

export type writeJsonSchemaInsufficientKeysMessage<
	describedExpectedKeys extends string,
	printableJsonSchema extends string
> = `Provided JSON Schema must have at least one of the keys ${describedExpectedKeys} (was ${printableJsonSchema})`
export const writeJsonSchemaInsufficientKeysMessage = <
	describedExpectedKeys extends string,
	printableJsonSchema extends string
>(
	describedExpectedKeys: describedExpectedKeys,
	printableJsonSchema: printableJsonSchema
): writeJsonSchemaInsufficientKeysMessage<
	describedExpectedKeys,
	printableJsonSchema
> =>
	`Provided JSON Schema must have at least one of the keys ${describedExpectedKeys} (was ${printableJsonSchema})`

export type writeJsonSchemaUnsupportedTypeMessage<
	printableType extends string
> =
	`Provided 'type' value must be a supported JSON Schema type (was '${printableType}')`
export const writeJsonSchemaUnsupportedTypeMessage = <
	printableType extends string
>(
	printableType: printableType
): writeJsonSchemaUnsupportedTypeMessage<printableType> =>
	`Provided 'type' value must be a supported JSON Schema type (was '${printableType}')`

/* Array Schema Parsing Errors */
export type writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage =
	"Provided array JSON Schema cannot have 'additionalItems' and 'items' and 'prefixItems'"
export const writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage =
	(): writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage =>
		"Provided array JSON Schema cannot have 'additionalItems' and 'items' and 'prefixItems'"

export type writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage =
	"Provided array JSON Schema cannot have non-array 'items' and 'additionalItems"
export const writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage =
	(): writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage =>
		"Provided array JSON Schema cannot have non-array 'items' and 'additionalItems"

/* Number Schema Parsing Errors */
export type writeJsonSchemaNumberMaximumAndExclusiveMaximumMessage =
	"Provided number JSON Schema cannot have 'maximum' and 'exclusiveMaximum"
export const writeJsonSchemaNumberMaximumAndExclusiveMaximumMessage =
	(): writeJsonSchemaNumberMaximumAndExclusiveMaximumMessage =>
		"Provided number JSON Schema cannot have 'maximum' and 'exclusiveMaximum"

export type writeJsonSchemaNumberMinimumAndExclusiveMinimumMessage =
	"Provided number JSON Schema cannot have 'minimum' and 'exclusiveMinimum"
export const writeJsonSchemaNumberMinimumAndExclusiveMinimumMessage =
	(): writeJsonSchemaNumberMinimumAndExclusiveMinimumMessage =>
		"Provided number JSON Schema cannot have 'minimum' and 'exclusiveMinimum"

/* Object Schema Parsing Errors */
export type writeJsonSchemaObjectNonConformingKeyAndPropertyNamesMessage<
	requiredKey extends string,
	propertyNamesExpression extends string
> = `Required key ${requiredKey} doesn't conform to propertyNames schema of ${propertyNamesExpression}`
export const writeJsonSchemaObjectNonConformingKeyAndPropertyNamesMessage = <
	requiredKey extends string,
	propertyNamesExpression extends string
>(
	requiredKey: requiredKey,
	propertyNamesExpression: propertyNamesExpression
): writeJsonSchemaObjectNonConformingKeyAndPropertyNamesMessage<
	requiredKey,
	propertyNamesExpression
> =>
	`Required key ${requiredKey} doesn't conform to propertyNames schema of ${propertyNamesExpression}`

export type writeJsonSchemaObjectNonConformingPatternAndPropertyNamesMessage<
	patternPropertySignatureExpression extends string,
	propertyNamesExpression extends string
> = `Pattern property ${patternPropertySignatureExpression} doesn't conform to propertyNames schema of ${propertyNamesExpression}`
export const writeJsonSchemaObjectNonConformingPatternAndPropertyNamesMessage =
	<
		patternPropertySignatureExpression extends string,
		propertyNamesExpression extends string
	>(
		patternPropertySignatureExpression: patternPropertySignatureExpression,
		propertyNamesExpression: propertyNamesExpression
	): writeJsonSchemaObjectNonConformingPatternAndPropertyNamesMessage<
		patternPropertySignatureExpression,
		propertyNamesExpression
	> =>
		`Pattern property ${patternPropertySignatureExpression} doesn't conform to propertyNames schema of ${propertyNamesExpression}`
