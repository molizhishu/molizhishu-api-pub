package com.molizhishu.demo.support;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Masks server-side API keys before returning settings to the frontend.
 */
public final class ApiKeyMasker {

	private ApiKeyMasker() {
	}

	public static Map<String, Object> mask(String value) {
		String              token  = value == null ? "" : value.trim();
		Map<String, Object> result = new LinkedHashMap<>();

		if (token.isEmpty()) {
			result.put("configured", false);
			result.put("masked", null);
			result.put("last4", null);
			return result;
		}

		String last4 = token.length() <= 4 ? token : token.substring(token.length() - 4);
		result.put("configured", true);
		result.put("masked", "*".repeat(Math.max(8, token.length() - 4)) + last4);
		result.put("last4", last4);
		return result;
	}
}
