package com.molizhishu.demo.support;

import java.util.List;
import java.util.Map;

/**
 * Validates task submission payloads accepted by the local API.
 */
public final class SubmitPayloadValidator {

	private SubmitPayloadValidator() {
	}

	public static String validate(Map<String, Object> payload) {
		Object prompts = payload.get("prompts");
		if (!(prompts instanceof List<?> promptRows) || promptRows.isEmpty()) {
			return "prompts 必须是非空数组";
		}

		if (promptRows.size() > 50) {
			return "prompts 最多 50 个";
		}

		Object platforms = payload.get("platforms");
		if (!(platforms instanceof List<?> platformRows) || platformRows.isEmpty()) {
			return "platforms 必须是非空数组";
		}

		for (Object item : platformRows) {
			if (!(item instanceof Map<?, ?> row) || row.get("platform") == null || row.get("mode") == null) {
				return "platforms 每一项必须包含 platform 和 mode";
			}
		}

		return null;
	}
}
