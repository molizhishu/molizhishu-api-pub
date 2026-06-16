package com.molizhishu.demo.service;

import com.molizhishu.demo.client.MolizhishuClient;
import com.molizhishu.demo.mapper.TaskMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Synchronizes local task records with Molizhishu remote APIs.
 *
 * <p>The service is intentionally trigger-agnostic. It can be called by the
 * scheduled job, the manual compensation endpoint, or tests without duplicating
 * polling and persistence rules.</p>
 */
@Service
public class TaskSyncService {

	private static final Logger log = LoggerFactory.getLogger(TaskSyncService.class);

	private static final List<String> TERMINAL_STATUSES = List.of("completed", "partial_completed", "failed", "stopped");

	private final MolizhishuClient client;

	private final TaskService taskService;

	private final TaskMapper taskMapper;

	public TaskSyncService(MolizhishuClient client, TaskService taskService, TaskMapper taskMapper) {
		this.client = client;
		this.taskService = taskService;
		this.taskMapper = taskMapper;
	}

	/**
	 * Fetches status for one task and persists the latest snapshot.
	 *
	 * <p>When the master task is terminal, or when any subtask is already
	 * terminal, the result endpoint is also fetched. This preserves partial
	 * results before the whole master task has completed.</p>
	 *
	 * @param taskId Molizhishu task id.
	 * @param source log source used to distinguish scheduled and manual sync.
	 * @return the freshest payload persisted locally.
	 */
	public Map<String, Object> syncOne(String taskId, String source) {
		Instant             started = Instant.now();
		Map<String, Object> status  = client.getTaskStatus(taskId, source + ":status");
		taskService.saveRemoteResult(status);

		boolean fetchResult = terminalStatus(status.get("status")) || hasCompletedItems(status);

		Map<String, Object> data = status;

		if (fetchResult) {
			data = client.getTaskResult(taskId, source + ":result");
			taskService.saveRemoteResult(data);
		}

		log.info("[sync] source={} task_id={} status={} fetch_result={} duration={}ms",
				source, taskId, status.getOrDefault("status", "unknown"),
				fetchResult, Duration.between(started, Instant.now()).toMillis()
		);

		return data;
	}

	/**
	 * Synchronizes a bounded batch of unfinished or incomplete local tasks.
	 *
	 * @param limit  maximum task ids to process in one pass.
	 * @param source log source used for observability.
	 */
	public void syncUnfinished(int limit, String source) {
		List<String> taskIds = taskMapper.unfinishedTaskIds(Math.max(limit, 1));
		int          synced  = 0;
		int          failed  = 0;

		for (String taskId : taskIds) {
			try {
				syncOne(taskId, source);
				synced++;
			} catch (Exception e) {
				failed++;
				log.error("[sync] source={} task_id={} failed=true error=\"{}\"", source, taskId, e.getMessage());
			}
		}

		log.info("[sync] source={} total={} synced={} failed={}", source, taskIds.size(), synced, failed);
	}

	@SuppressWarnings("unchecked")
	private boolean hasCompletedItems(Map<String, Object> status) {
		if (status.get("completedItems") instanceof Number number && number.intValue() > 0) {
			return true;
		}

		Object rows = status.get("subTaskList");
		if (!(rows instanceof List<?> list)) {
			return false;
		}

		for (Object item : list) {
			if (item instanceof Map<?, ?> row && terminalStatus(row.get("status"))) {
				return true;
			}
		}

		return false;
	}

	private boolean terminalStatus(Object status) {
		return TERMINAL_STATUSES.contains(String.valueOf(status));
	}

}
