package com.molizhishu.demo.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface TaskMapper {

	@Insert("""
			INSERT INTO geo_tasks (task_id, status, prompts_json, platforms_json, region_code_json, callback_url,
			  total_items, completed_items, failed_items, poll_url, created_at, completed_at, raw_request_json, raw_response_json,
			  created_local_at, updated_at)
			VALUES (#{taskId}, #{status}, #{promptsJson}, #{platformsJson}, #{regionCodeJson}, #{callbackUrl},
			  #{totalItems}, #{completedItems}, #{failedItems}, #{pollUrl}, #{createdAt}, #{completedAt}, #{rawRequestJson}, #{rawResponseJson},
			  NOW(), NOW())
			ON DUPLICATE KEY UPDATE status=VALUES(status), total_items=VALUES(total_items),
			  completed_items=VALUES(completed_items), failed_items=VALUES(failed_items), poll_url=VALUES(poll_url),
			  created_at=VALUES(created_at), completed_at=VALUES(completed_at), raw_response_json=VALUES(raw_response_json),
			  updated_at=NOW()
			""")
	void upsert(@Param("taskId") String taskId, @Param("status") String status, @Param("promptsJson") String promptsJson,
	            @Param("platformsJson") String platformsJson, @Param("regionCodeJson") String regionCodeJson,
	            @Param("callbackUrl") String callbackUrl, @Param("totalItems") int totalItems,
	            @Param("completedItems") int completedItems, @Param("failedItems") int failedItems,
	            @Param("pollUrl") String pollUrl, @Param("createdAt") Long createdAt, @Param("completedAt") Long completedAt,
	            @Param("rawRequestJson") String rawRequestJson, @Param("rawResponseJson") String rawResponseJson);

	@Select("""
			SELECT * FROM geo_tasks
			WHERE (#{status} IS NULL OR #{status} = '' OR status = #{status})
			ORDER BY created_local_at DESC
			LIMIT #{size} OFFSET #{offset}
			""")
	List<Map<String, Object>> list(@Param("status") String status, @Param("size") int size, @Param("offset") int offset);

	@Select("""
			SELECT COUNT(*) FROM geo_tasks
			WHERE (#{status} IS NULL OR #{status} = '' OR status = #{status})
			""")
	long count(@Param("status") String status);

	@Select("SELECT * FROM geo_tasks WHERE task_id = #{taskId}")
	Map<String, Object> find(@Param("taskId") String taskId);

	@Select("""
			SELECT t.task_id
			FROM geo_tasks t
			LEFT JOIN geo_subtasks s ON s.task_id = t.task_id
			WHERE t.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
			   OR s.subtask_id IS NULL
			   OR s.status IS NULL
			   OR s.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
			   OR (
			       t.status IN ('completed', 'partial_completed')
			       AND s.status = 'completed'
			       AND (s.answer_content IS NULL OR s.answer_content = '')
			   )
			GROUP BY t.task_id
			ORDER BY MIN(t.created_local_at) ASC
			LIMIT #{limit}
			""")
	List<String> unfinishedTaskIds(@Param("limit") int limit);
}
