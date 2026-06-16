package com.molizhishu.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "molizhishu")
public record MolizhishuProperties(
		String token,
		String baseUrl,
		String cityUrl,
		String callbackUrl,
		int timeoutSeconds,
		boolean allowApiKeyUpdate,
		boolean syncEnabled,
		int syncIntervalSeconds,
		int syncLimit
) { }
