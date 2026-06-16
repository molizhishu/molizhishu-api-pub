package com.molizhishu.demo.controller;

import com.molizhishu.demo.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	@PostMapping("/api/auth/login")
	public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> payload, HttpServletRequest request) {
		try {
			return ResponseEntity.ok(ok(authService.login(payload.get("username"), payload.get("password"), request)));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error(e.getMessage()));
		}
	}

	@GetMapping("/api/auth/me")
	public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
		Map<String, Object> user = authService.authenticate(authService.bearerToken(request));
		if (user == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("登录已失效"));
		}
		return ResponseEntity.ok(ok(authService.publicUser(user)));
	}

	@PostMapping("/api/auth/logout")
	public Map<String, Object> logout(HttpServletRequest request) {
		authService.logout(authService.bearerToken(request));
		return ok(true);
	}

	private Map<String, Object> ok(Object data) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("success", true);
		body.put("data", data);
		return body;
	}

	private Map<String, Object> error(String message) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("success", false);
		body.put("message", message);
		return body;
	}

}
