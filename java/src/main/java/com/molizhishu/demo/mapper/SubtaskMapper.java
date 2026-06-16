package com.molizhishu.demo.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface SubtaskMapper {

	@Insert("""
			INSERT INTO geo_subtasks (subtask_id, task_id, platform, mode, prompt, status, time, page_screenshot,
			  answer_content, reference_list_json, citation_list_json, reasoning_process_json,
			  recommended_questions_json, media_content_json, error_message, proxy_ip, raw_result_json, updated_at)
			VALUES (#{subTaskId}, #{taskId}, #{platform}, #{mode}, #{prompt}, #{status}, #{time}, #{pageScreenshot},
			  #{answerContent}, #{referenceListJson}, #{citationListJson}, #{reasoningProcessJson},
			  #{recommendedQuestionsJson}, #{mediaContentJson}, #{errorMessage}, #{proxyIp}, #{rawResultJson}, NOW())
			ON DUPLICATE KEY UPDATE platform=VALUES(platform), mode=VALUES(mode), prompt=VALUES(prompt),
			  status=VALUES(status), time=VALUES(time), page_screenshot=VALUES(page_screenshot),
			  answer_content=VALUES(answer_content), reference_list_json=VALUES(reference_list_json),
			  citation_list_json=VALUES(citation_list_json), reasoning_process_json=VALUES(reasoning_process_json),
			  recommended_questions_json=VALUES(recommended_questions_json), media_content_json=VALUES(media_content_json),
			  error_message=VALUES(error_message), proxy_ip=VALUES(proxy_ip), raw_result_json=VALUES(raw_result_json),
			  updated_at=NOW()
			""")
	void upsert(@Param("subTaskId") String subTaskId, @Param("taskId") String taskId, @Param("platform") String platform,
	            @Param("mode") String mode, @Param("prompt") String prompt, @Param("status") String status,
	            @Param("time") Long time, @Param("pageScreenshot") String pageScreenshot,
	            @Param("answerContent") String answerContent, @Param("referenceListJson") String referenceListJson,
	            @Param("citationListJson") String citationListJson, @Param("reasoningProcessJson") String reasoningProcessJson,
	            @Param("recommendedQuestionsJson") String recommendedQuestionsJson, @Param("mediaContentJson") String mediaContentJson,
	            @Param("errorMessage") String errorMessage, @Param("proxyIp") String proxyIp,
	            @Param("rawResultJson") String rawResultJson);

	@Select("SELECT * FROM geo_subtasks WHERE task_id = #{taskId} ORDER BY subtask_id ASC")
	List<Map<String, Object>> findByTaskId(@Param("taskId") String taskId);

}
