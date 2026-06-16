package com.molizhishu.demo.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.molizhishu.demo.mapper.CallbackEventMapper;
import com.molizhishu.demo.mapper.SubtaskMapper;
import com.molizhishu.demo.mapper.TaskMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class TaskService {

	private final TaskMapper taskMapper;

	private final SubtaskMapper subtaskMapper;

	private final CallbackEventMapper callbackEventMapper;

	private final ObjectMapper objectMapper;

	public TaskService(TaskMapper taskMapper, SubtaskMapper subtaskMapper, CallbackEventMapper callbackEventMapper, ObjectMapper objectMapper) {
		this.taskMapper = taskMapper;
		this.subtaskMapper = subtaskMapper;
		this.callbackEventMapper = callbackEventMapper;
		this.objectMapper = objectMapper;
	}

	@Transactional
	public void saveSubmittedTask(Map<String, Object> request, Map<String, Object> response) {
		String taskId = string(response.get("taskId"));

		taskMapper.upsert(taskId, stringOr(response.get("status"), "pending"), json(request.get("prompts")),
				json(request.get("platforms")), json(request.get("regionCode")), string(response.get("callbackUrl")),
				intValue(response.get("totalTask"), intValue(response.get("totalItems"), 0)), 0,
				0, string(response.get("pollUrl")), null, null, json(request), json(response)
		);

		upsertSubtasks(taskId, list(response.get("subTaskList")));
	}

	@Transactional
	public void saveRemoteResult(Map<String, Object> payload) {
		String taskId = string(payload.get("taskId"));

		taskMapper.upsert(
				taskId, stringOr(payload.get("status"), "processing"), "[]", "[]", "[]",
				string(payload.get("callbackUrl")), intValue(payload.get("totalItems"), 0),
				intValue(payload.get("completedItems"), 0), intValue(payload.get("failedItems"), 0),
				string(payload.get("pollUrl")), longValue(payload.get("createdAt")),
				longValue(payload.get("completedAt")), "{}", json(payload)
		);

		upsertSubtasks(taskId, list(payload.get("subTaskList")));
	}

	@Transactional
	public boolean saveCallback(Map<String, Object> payload) {
		String taskId      = string(payload.get("taskId"));
		String payloadJson = json(payload);

		try {
			callbackEventMapper.insert(taskId, payloadJson, sha256(payloadJson), "processed");
		} catch (DuplicateKeyException duplicate) {
			return true;
		}

		saveRemoteResult(payload);

		return false;
	}

	public Map<String, Object> listTasks(int page, int size, String status) {
		int offset = Math.max(page - 1, 0) * size;

		return Map.of("items", taskMapper.list(status, size, offset), "total", taskMapper.count(status), "page", page, "size", size);
	}

	public Map<String, Object> getTask(String taskId) {
		Map<String, Object> task = taskMapper.find(taskId);

		if (task != null) {
			task.put("subTaskList", subtaskMapper.findByTaskId(taskId));
			task.put("callbackEvents", callbackEventMapper.findByTaskId(taskId));
		}

		return task;
	}

	private void upsertSubtasks(String taskId, List<Object> rows) {
		for (Object item : rows) {
			if (!(item instanceof Map<?, ?> raw)) {
				continue;
			}

			@SuppressWarnings("unchecked")
			Map<String, Object> row = (Map<String, Object>) raw;
			String subTaskId = string(row.get("subTaskId"));

			if (subTaskId == null || subTaskId.isBlank()) {
				continue;
			}

			subtaskMapper.upsert(subTaskId, taskId, string(row.get("platform")), string(row.get("mode")), string(row.get("prompt")),
					string(row.get("status")), longValue(row.get("time")), string(row.get("pageScreenshot")),
					string(row.get("answerContent")), json(row.get("referenceList")), json(row.get("citationList")),
					json(row.get("reasoningProcess")), json(row.get("recommendedQuestions")), json(row.get("mediaContent")),
					string(row.get("errorMessage")), string(row.get("proxyIp")), json(row));
		}
	}

	private String json(Object value) {
		try {
			return objectMapper.writeValueAsString(value == null ? List.of() : value);
		} catch (JsonProcessingException e) {
			throw new IllegalArgumentException("JSON 序列化失败", e);
		}
	}

	@SuppressWarnings("unchecked")
	private List<Object> list(Object value) {
		return value instanceof List<?> rows ? (List<Object>) rows : List.of();
	}

	private String string(Object value) {
		return value == null ? null : value.toString();
	}

	private String stringOr(Object value, String fallback) {
		String result = string(value);
		return result == null || result.isBlank() ? fallback : result;
	}

	private int intValue(Object value, int fallback) {
		return value instanceof Number number ? number.intValue() : fallback;
	}

	private Long longValue(Object value) {
		return value instanceof Number number ? number.longValue() : null;
	}

	private String sha256(String value) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

}
