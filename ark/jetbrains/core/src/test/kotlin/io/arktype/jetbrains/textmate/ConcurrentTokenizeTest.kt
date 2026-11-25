package io.arktype.jetbrains.textmate

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.io.File
import java.util.concurrent.Callable
import java.util.concurrent.Executors

class ConcurrentTokenizeTest {
	private val samples =
		File(System.getProperty("ark.repoRoot"), "ark/jetbrains/core/src/test/resources/samples")
			.listFiles()
			.orEmpty()
			.sortedBy { it.name }
			.map { it.readText() to it.extension }

	/**
	 * Grammar instances keep mutable caches (compiled rules, back-reference
	 * end patterns), so calls on many threads at once, each sharing hosts
	 * with the others, must still get what one thread gets.
	 */
	@Test
	fun concurrentCallsMatchSequential() {
		val registry = TextMateRegistry.fromClasspath()
		val expected = samples.map { (text, ext) -> registry.tokenize(text, ext) }
		val pool = Executors.newFixedThreadPool(8)
		try {
			val tasks =
				(0 until 64).map { i ->
					val sample = i % samples.size
					Callable { sample to registry.tokenize(samples[sample].first, samples[sample].second) }
				}
			for (future in pool.invokeAll(tasks)) {
				val (sample, tokens) = future.get()
				assertEquals(expected[sample], tokens)
			}
		} finally {
			pool.shutdown()
		}
	}

	@Test
	fun unknownExtension() {
		val error = assertThrows(IllegalArgumentException::class.java) { tokenize("x", "py") }
		assertEquals("No TextMate host for .py", error.message)
	}
}
