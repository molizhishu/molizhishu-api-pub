package com.molizhishu.demo.support;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds the local response envelope consumed by the shared frontend.
 */
public final class ApiEnvelope {

	private ApiEnvelope() {
	}

	public static Map<String, Object> ok(Object data) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("success", true);
		body.put("data", data);
		return body;
	}

	public static Map<String, Object> error(String message, Integer code) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("success", false);
		body.put("code", code);
		body.put("message", message);
		return body;
	}
}
