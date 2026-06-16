package com.molizhishu.demo.client;

import com.molizhishu.demo.config.MolizhishuProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Component
public class MolizhishuClient {

	private final MolizhishuProperties properties;

	private final RestClient restClient;

	private static final Logger log = LoggerFactory.getLogger(MolizhishuClient.class);

	public MolizhishuClient(MolizhishuProperties properties, RestClient.Builder builder) {
		this.properties = properties;
		this.restClient = builder.build();
	}

	public Map<String, Object> submitTask(Map<String, Object> payload) {
		return request(HttpMethod.POST, properties.baseUrl() + "/task/batch/shared", payload, "local-api:submit-task");
	}

	public Map<String, Object> getTaskStatus(String taskId, String source) {
		return request(HttpMethod.GET, properties.baseUrl() + "/task/status/" + taskId, null, source);
	}

	public Map<String, Object> getTaskResult(String taskId, String source) {
		return request(HttpMethod.GET, properties.baseUrl() + "/task/result/" + taskId, null, source);
	}

	public Object stopTask(String taskId) {
		return request(HttpMethod.PUT, properties.baseUrl() + "/task/" + taskId + "/stop", null, "local-api:stop-task").get("value");
	}

	public Object getCallbackUrl() {
		return request(HttpMethod.GET, properties.baseUrl() + "/task/callback-url", null, "local-api:callback-url:get").get("value");
	}

	public Object updateCallbackUrl(String callbackUrl) {
		Map<String, Object> payload = new HashMap<>();
		payload.put("callbackUrl", callbackUrl);
		return request(HttpMethod.PUT, properties.baseUrl() + "/task/callback-url", payload, "local-api:callback-url:update").get("value");
	}

	public Object getCities() {
		return request(HttpMethod.GET, properties.cityUrl(), null, "local-api:cities").get("value");
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> request(HttpMethod method, String url, Object payload, String source) {
		if (properties.token() == null || properties.token().isBlank()) {
			throw new MolizhishuApiException("MOLIZHISHU_TOKEN 未配置", null, 0);
		}

		Instant started = Instant.now();

		Map<String, Object> envelope = restClient.method(method)
				.uri(url)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.token())
				.accept(MediaType.APPLICATION_JSON)
				.contentType(MediaType.APPLICATION_JSON)
				.body(payload == null ? "" : payload)
				.retrieve()
				.body(Map.class);

		boolean success = Boolean.TRUE.equals(Objects.requireNonNull(envelope).get("success"));
		Integer code    = envelope.get("code") instanceof Number number ? number.intValue() : null;
		String  message = envelope.get("message") == null ? "" : envelope.get("message").toString();

		log.info("[molizhishu] source={} method={} url={} success={} code={} message=\"{}\" duration={}ms",
				source, method.name(), url, success, code, message, Duration.between(started, Instant.now()).toMillis()
		);

		if (!success) {
			throw new MolizhishuApiException(message.isBlank() ? "模力指数业务处理失败" : message, code, 502);
		}

		Object data = envelope.get("data");

		if (data instanceof Map<?, ?> map) {
			return (Map<String, Object>) map;
		}

		return Map.of("value", data);
	}

}
