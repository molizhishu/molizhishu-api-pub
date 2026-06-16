package com.molizhishu.demo.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface CallbackEventMapper {

	@Insert("""
			INSERT INTO geo_callback_events (task_id, payload_json, payload_hash, process_status, processed_at)
			VALUES (#{taskId}, #{payloadJson}, #{payloadHash}, #{processStatus}, NOW())
			""")
	void insert(@Param("taskId") String taskId, @Param("payloadJson") String payloadJson,
	            @Param("payloadHash") String payloadHash, @Param("processStatus") String processStatus);

	@Select("SELECT * FROM geo_callback_events WHERE task_id = #{taskId} ORDER BY received_at DESC LIMIT 20")
	List<Map<String, Object>> findByTaskId(@Param("taskId") String taskId);

}
