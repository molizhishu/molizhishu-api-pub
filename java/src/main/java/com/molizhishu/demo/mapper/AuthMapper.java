package com.molizhishu.demo.mapper;

import org.apache.ibatis.annotations.*;

import java.time.LocalDateTime;
import java.util.Map;

@Mapper
public interface AuthMapper {

	@Select("SELECT * FROM geo_admin_users WHERE username = #{username} AND status = 1")
	Map<String, Object> findByUsername(@Param("username") String username);

	@Select("SELECT * FROM geo_admin_users WHERE auth_token_hash = #{tokenHash} AND status = 1")
	Map<String, Object> findByTokenHash(@Param("tokenHash") String tokenHash);

	@Update("""
			UPDATE geo_admin_users
			SET auth_token_hash = #{tokenHash}, token_expires_at = #{expiresAt},
			    last_login_at = NOW(), last_login_ip = #{ip}, updated_at = NOW()
			WHERE id = #{id}
			""")
	void updateToken(@Param("id") Object id, @Param("tokenHash") String tokenHash,
	                 @Param("expiresAt") LocalDateTime expiresAt, @Param("ip") String ip);

	@Update("UPDATE geo_admin_users SET auth_token_hash = NULL, token_expires_at = NULL, updated_at = NOW() WHERE id = #{id}")
	void clearToken(@Param("id") Object id);
}
