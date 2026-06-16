package com.molizhishu.demo.service;

import com.molizhishu.demo.mapper.AuthMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

	private final AuthMapper            authMapper;

	private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	public AuthService(AuthMapper authMapper) {
		this.authMapper = authMapper;
	}

	public Map<String, Object> login(String username, String password, HttpServletRequest request) {
		Map<String, Object> user = authMapper.findByUsername(username == null ? "" : username.trim());
		if (user == null || password == null || password.isBlank() || !passwordEncoder.matches(password, String.valueOf(user.get("password_hash")))) {
			throw new IllegalArgumentException("账号或密码不正确");
		}

		String        token     = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
		LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);
		authMapper.updateToken(user.get("id"), sha256(token), expiresAt, request.getRemoteAddr());

		return Map.of("token", token, "expiresAt", expiresAt.toString().replace("T", " "), "user", publicUser(user));
	}

	public Map<String, Object> authenticate(String token) {
		if (token == null || token.isBlank()) {
			return null;
		}

		Map<String, Object> user = authMapper.findByTokenHash(sha256(token.trim()));
		if (user == null) {
			return null;
		}

		Object expiresAt = user.get("token_expires_at");
		if (expiresAt instanceof LocalDateTime time && time.isBefore(LocalDateTime.now())) {
			return null;
		}

		return user;
	}

	public void logout(String token) {
		Map<String, Object> user = authenticate(token);

		if (user != null) {
			authMapper.clearToken(user.get("id"));
		}
	}

	public Map<String, Object> publicUser(Map<String, Object> user) {
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("id", user.get("id"));
		result.put("username", user.get("username"));
		result.put("displayName", user.get("display_name"));
		result.put("role", user.get("role"));

		return result;
	}

	public String bearerToken(HttpServletRequest request) {
		String header = request.getHeader("Authorization");
		if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
			return "";
		}
		return header.substring(7).trim();
	}

	private String sha256(String value) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

}
