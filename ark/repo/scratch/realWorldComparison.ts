import { bench } from "@ark/attest"
import { scope, type } from "arktype"
import { z } from "zod"

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
}).types([16167, "instantiations"])

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
}).types([26173, "instantiations"])

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
}).types([27703, "instantiations"])
