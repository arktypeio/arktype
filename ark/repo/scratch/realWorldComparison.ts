import { bench } from "@ark/attest"
import { scope, type } from "arktype"
import { z } from "zod"

bench.baseline(() => {
	type({ foo: "string" }).or({ bar: "number" }).array()
	z.array(
		z.union([z.object({ foo: z.string() }), z.object({ bar: z.number() })])
	)
})

bench("arktype", () => {
	const authenticatorTransportFutureSchema = type(
		"('ble'|'internal'|'nfc'|'usb'|'cable'|'hybrid')[]"
	)

	const authenticatorAttachmentSchema = type("'cross-platform'|'platform'")

	const authenticationResponseJSONSchema = type({
		id: "string",
		rawId: "string",
		response: {
			clientDataJSON: "string",
			authenticatorData: "string",
			signature: "string",
			"userHandle?": "string"
		},
		"authenticatorAttachment?": authenticatorAttachmentSchema,
		clientExtensionResults: {
			"appid?": "boolean",
			"credProps?": {
				"rk?": "boolean"
			},
			"hmacCreateSecret?": "boolean"
		},
		type: "'public-key'"
	})

	const verifyRegistrationResponseOptsSchema = type({
		id: "string",
		rawId: "string",
		response: {
			clientDataJSON: "string",
			attestationObject: "string",
			"transports?": authenticatorTransportFutureSchema
		},
		"authenticatorAttachment?": authenticatorAttachmentSchema,
		clientExtensionResults: {
			"appid?": "boolean",
			"credProps?": {
				"rk?": "boolean"
			},
			"hmacCreateSecret?": "boolean"
		},
		type: "'public-key'"
	})

	const out = verifyRegistrationResponseOptsSchema
		.pick("id", "clientExtensionResults", "authenticatorAttachment")
		.omit("clientExtensionResults")
}).types([10451, "instantiations"])

bench("arktype scope", () => {
	return scope({
		authenticatorTransportFutureSchema:
			"('ble'|'internal'|'nfc'|'usb'|'cable'|'hybrid')[]",
		authenticatorAttachmentSchema: "'cross-platform'|'platform'",
		authenticationResponseJSONSchema: {
			id: "string",
			rawId: "string",
			response: {
				clientDataJSON: "string",
				authenticatorData: "string",
				signature: "string",
				"userHandle?": "string"
			},
			"authenticatorAttachment?": "authenticatorAttachmentSchema",
			clientExtensionResults: {
				"appid?": "boolean",
				"credProps?": {
					"rk?": "boolean"
				},
				"hmacCreateSecret?": "boolean"
			},
			type: "'public-key'"
		},
		verifyRegistrationResponseOptsSchema: {
			id: "string",
			rawId: "string",
			response: {
				clientDataJSON: "string",
				attestationObject: "string",
				"transports?": "authenticatorTransportFutureSchema"
			},
			"authenticatorAttachment?": "authenticatorAttachmentSchema",
			clientExtensionResults: {
				"appid?": "boolean",
				"credProps?": {
					"rk?": "boolean"
				},
				"hmacCreateSecret?": "boolean"
			},
			type: "'public-key'"
		}
	}).export()
}).types([8513, "instantiations"])

bench("zod", () => {
	const authenticatorTransportFutureSchema = z.array(
		z.union([
			z.literal("ble"),
			z.literal("internal"),
			z.literal("nfc"),
			z.literal("usb"),
			z.literal("cable"),
			z.literal("hybrid")
		])
	)
	const authenticatorAttachmentSchema = z.union([
		z.literal("cross-platform"),
		z.literal("platform")
	])
	const authenticationResponseJSONSchema = z.object({
		id: z.string(),
		rawId: z.string(),
		response: z.object({
			clientDataJSON: z.string(),
			authenticatorData: z.string(),
			signature: z.string(),
			userHandle: z.string().optional()
		}),
		authenticatorAttachment: authenticatorAttachmentSchema.optional(),
		clientExtensionResults: z.object({
			appid: z.boolean().optional(),
			credProps: z
				.object({
					rk: z.boolean().optional()
				})
				.optional(),
			hmacCreateSecret: z.boolean().optional()
		}),
		type: z.literal("public-key")
	})

	const verifyRegistrationResponseOptsSchema = z.object({
		id: z.string(),
		rawId: z.string(),
		response: z.object({
			clientDataJSON: z.string(),
			attestationObject: z.string(),
			transports: authenticatorTransportFutureSchema.optional()
		}),
		authenticatorAttachment: authenticatorAttachmentSchema.optional(),
		clientExtensionResults: z.object({
			appid: z.boolean().optional(),
			credProps: z
				.object({
					rk: z.boolean().optional()
				})
				.optional(),
			hmacCreateSecret: z.boolean().optional()
		}),
		type: z.literal("public-key")
	})

	const ok = verifyRegistrationResponseOptsSchema
		.pick({
			id: true,
			response: true,
			clientExtensionResults: true
		})
		.omit({ clientExtensionResults: true })
}).types([16666, "instantiations"])
