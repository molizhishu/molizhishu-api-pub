package com.molizhishu.demo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.molizhishu.demo.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
public class AuthInterceptor implements HandlerInterceptor {

	private final AuthService authService;

	private final ObjectMapper objectMapper;

	public AuthInterceptor(AuthService authService, ObjectMapper objectMapper) {
		this.authService = authService;
		this.objectMapper = objectMapper;
	}

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
		if (authService.authenticate(authService.bearerToken(request)) != null) {
			return true;
		}

		response.setStatus(401);
		response.setContentType("application/json;charset=UTF-8");
		objectMapper.writeValue(response.getWriter(), Map.of("success", false, "message", "请先登录"));

		return false;
	}

}
