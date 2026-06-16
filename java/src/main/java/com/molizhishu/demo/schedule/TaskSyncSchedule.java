package com.molizhishu.demo.schedule;

import com.molizhishu.demo.config.MolizhishuProperties;
import com.molizhishu.demo.service.TaskSyncService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically reconciles local unfinished tasks with Molizhishu remote status.
 *
 * <p>This class owns only scheduling concerns. The actual API calls and database
 * writes live in {@link TaskSyncService}, so manual compensation endpoints and
 * scheduled polling share the same behavior.</p>
 */
@Component
public class TaskSyncSchedule {

	private static final Logger log = LoggerFactory.getLogger(TaskSyncSchedule.class);

	private final TaskSyncService      taskSyncService;

	private final MolizhishuProperties properties;

	public TaskSyncSchedule(TaskSyncService taskSyncService, MolizhishuProperties properties) {
		this.taskSyncService = taskSyncService;
		this.properties = properties;
	}

	/**
	 * Logs scheduler configuration once on startup to make container diagnostics
	 * obvious without exposing secrets.
	 */
	@PostConstruct
	public void logScheduleStatus() {
		if (!properties.syncEnabled()) {
			log.info("[sync] scheduled sync disabled");
			return;
		}

		log.info("[sync] scheduled sync enabled interval={}s limit={}",
				Math.max(properties.syncIntervalSeconds(), 1), Math.max(properties.syncLimit(), 1)
		);
	}

	/**
	 * Runs the scheduled compensation pass.
	 *
	 * <p>The interval is controlled by {@code MOLIZHISHU_SYNC_INTERVAL_SECONDS}
	 * through {@code molizhishu.sync-interval-seconds}. A disabled scheduler
	 * returns immediately so the bean can remain registered in every profile.</p>
	 */
	@Scheduled(initialDelayString = "1000", fixedDelayString = "#{${molizhishu.sync-interval-seconds:60} * 1000}")
	public void syncUnfinishedTasks() {
		if (!properties.syncEnabled()) {
			return;
		}

		try {
			taskSyncService.syncUnfinished(Math.max(properties.syncLimit(), 1), "java-scheduled-sync");
		} catch (Exception e) {
			log.error("[sync] source=java-scheduled-sync failed=true error=\"{}\"", e.getMessage());
		}
	}
}
