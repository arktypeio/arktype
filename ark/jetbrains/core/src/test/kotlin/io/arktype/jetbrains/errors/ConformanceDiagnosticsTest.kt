package io.arktype.jetbrains.errors

import com.google.gson.JsonParser
import io.arktype.jetbrains.Conformance
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.TestFactory

/**
 * Every diagnostic case of the editor conformance suite is rewritten as
 * ErrorLens rewrites it with the VS Code extension's rules: by the same rule,
 * to the same message.
 */
class ConformanceDiagnosticsTest {
	private val lens = ErrorLens()

	@TestFactory
	fun cases(): List<DynamicTest> {
		val cases = JsonParser.parseString(Conformance.diagnosticCases.readText()).asJsonArray.map { it.asJsonObject }
		assertTrue(cases.isNotEmpty(), "the conformance suite has no diagnostic cases")
		return cases.map { case ->
			DynamicTest.dynamicTest(case["name"].asString) {
				val input = case["input"].asString
				val rule = case["rule"]?.takeUnless { it.isJsonNull }?.asInt
				assertEquals(rule, lens.matchingRule(input), "rule")
				assertEquals(case["output"].asString, lens.replace(input))
				case["display"]?.let { assertEquals(it.asString, lens.inlineMessage(input), "display") }
			}
		}
	}
}
