package com.molizhishu.demo.controller;

import com.molizhishu.demo.client.MolizhishuApiException;
import com.molizhishu.demo.client.MolizhishuClient;
import com.molizhishu.demo.config.MolizhishuProperties;
import com.molizhishu.demo.service.TaskSyncService;
import com.molizhishu.demo.service.TaskService;
import com.molizhishu.demo.support.ApiEnvelope;
import com.molizhishu.demo.support.ApiKeyMasker;
import com.molizhishu.demo.support.SubmitPayloadValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class TaskController {

	private final MolizhishuClient client;

	private final TaskService taskService;

	private final TaskSyncService taskSyncService;

	private final MolizhishuProperties properties;

	public TaskController(MolizhishuClient client, TaskService taskService, TaskSyncService taskSyncService, MolizhishuProperties properties) {
		this.client = client;
		this.taskService = taskService;
		this.taskSyncService = taskSyncService;
		this.properties = properties;
	}

	@GetMapping("/api/health")
	public Map<String, Object> health() {
		return ApiEnvelope.ok(Map.of("service", "molizhishu-api-pub-java", "status", "ok"));
	}

	@PostMapping("/api/tasks")
	public ResponseEntity<Map<String, Object>> createTask(@RequestBody Map<String, Object> payload) {
		String validation = SubmitPayloadValidator.validate(payload);
		if (validation != null) {
			return ResponseEntity.unprocessableEntity().body(ApiEnvelope.error(validation, null));
		}

		if (!payload.containsKey("callbackUrl") && properties.callbackUrl() != null && !properties.callbackUrl().isBlank()) {
			payload.put("callbackUrl", properties.callbackUrl());
		}

		Map<String, Object> data = client.submitTask(payload);
		taskService.saveSubmittedTask(payload, data);
		return ResponseEntity.ok(ApiEnvelope.ok(data));
	}

	@GetMapping("/api/tasks")
	public Map<String, Object> listTasks(@RequestParam(defaultValue = "1") int page,
	                                     @RequestParam(defaultValue = "20") int size,
	                                     @RequestParam(required = false) String status) {

		return ApiEnvelope.ok(taskService.listTasks(Math.max(page, 1), Math.min(Math.max(size, 1), 100), status));
	}

	@GetMapping("/api/tasks/{taskId}")
	public ResponseEntity<Map<String, Object>> getTask(@PathVariable String taskId) {
		Map<String, Object> task = taskService.getTask(taskId);

		if (task == null) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiEnvelope.error("任务不存在", null));
		}

		return ResponseEntity.ok(ApiEnvelope.ok(task));
	}

	@PostMapping("/api/tasks/{taskId}/sync")
	public Map<String, Object> syncTask(@PathVariable String taskId) {
		return ApiEnvelope.ok(taskSyncService.syncOne(taskId, "local-api:manual-compensation"));
	}

	@PutMapping("/api/tasks/{taskId}/stop")
	public Map<String, Object> stopTask(@PathVariable String taskId) {
		return ApiEnvelope.ok(Map.of("message", client.stopTask(taskId)));
	}

	@PostMapping("/webhooks/molizhishu")
	public ResponseEntity<Map<String, Object>> callback(@RequestBody Map<String, Object> payload) {
		if (!payload.containsKey("taskId") || !payload.containsKey("status")) {
			return ResponseEntity.badRequest().body(ApiEnvelope.error("taskId 和 status 必填", null));
		}

		boolean duplicate = taskService.saveCallback(payload);
		return ResponseEntity.ok(ApiEnvelope.ok(Map.of("duplicate", duplicate)));
	}

	@GetMapping("/api/callback-url")
	public Map<String, Object> getCallbackUrl() {
		return ApiEnvelope.ok(client.getCallbackUrl());
	}

	@PutMapping("/api/callback-url")
	public Map<String, Object> updateCallbackUrl(@RequestBody Map<String, Object> payload) {
		return ApiEnvelope.ok(client.updateCallbackUrl(payload.get("callbackUrl") == null ? null : payload.get("callbackUrl").toString()));
	}

	@GetMapping("/api/cities")
	public Map<String, Object> cities() {
		return ApiEnvelope.ok(client.getCities());
	}

	@GetMapping("/api/settings")
	public Map<String, Object> settings() {
		return ApiEnvelope.ok(Map.of(
				"apiKey", ApiKeyMasker.mask(properties.token()),
				"security", Map.of("apiKeyUpdateAllowed", properties.allowApiKeyUpdate())
		));
	}

	@PutMapping("/api/settings/api-key")
	public ResponseEntity<Map<String, Object>> updateApiKey() {
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiEnvelope.error("Java demo 未启用运行时写入配置，请通过服务端环境变量配置 API Key", null));
	}

	@ExceptionHandler(MolizhishuApiException.class)
	public ResponseEntity<Map<String, Object>> apiException(MolizhishuApiException e) {
		int status = e.getHttpStatus() >= 400 ? e.getHttpStatus() : 502;

		return ResponseEntity.status(status).body(ApiEnvelope.error(e.getMessage(), e.getCode()));
	}

}
