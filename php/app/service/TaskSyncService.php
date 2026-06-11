<?php
declare(strict_types=1);

namespace app\service;

use app\exception\MolizhishuApiException;
use think\facade\Db;
use think\facade\Log;

class TaskSyncService
{
    private const TERMINAL_STATUSES = ['completed', 'partial_completed', 'failed', 'stopped'];

    public function __construct(
        private readonly MolizhishuClient $client,
        private readonly TaskRepository $tasks
    ) {
    }

    public function syncOne(string $taskId, string $source = 'local-api:manual-compensation'): array
    {
        $started = microtime(true);
        $eventId = Db::name('compensation_events')->insertGetId([
            'task_id' => $taskId,
            'source' => $source,
            'action' => 'status',
            'request_url' => '/task/status/' . $taskId,
            'started_at' => date('Y-m-d H:i:s'),
        ]);

        try {
            $status = $this->client->getTaskStatus($taskId, $source . ':status');
            $this->tasks->applyRemoteStatus($taskId, $status);

            $result = null;
            $terminal = in_array(($status['status'] ?? null), self::TERMINAL_STATUSES, true);
            $shouldFetchResult = $terminal || $this->hasCompletedItems($status);
            if ($shouldFetchResult) {
                $result = $this->client->getTaskResult($taskId, $source . ':result');
                $this->tasks->applyRemoteResult($taskId, $result);
            }

            Db::name('compensation_events')->where('id', $eventId)->update([
                'http_status' => 200,
                'success' => 1,
                'code' => 200,
                'message' => (string) ($status['message'] ?? '操作成功'),
                'finished_at' => date('Y-m-d H:i:s'),
            ]);

            Log::info(sprintf(
                '[sync] source=%s task_id=%s status=%s terminal=%s fetch_result=%s duration=%dms',
                $source,
                $taskId,
                $status['status'] ?? 'unknown',
                $terminal ? 'true' : 'false',
                $shouldFetchResult ? 'true' : 'false',
                (int) round((microtime(true) - $started) * 1000)
            ));

            return ['status' => $status, 'result' => $result];
        } catch (MolizhishuApiException $e) {
            Db::name('compensation_events')->where('id', $eventId)->update([
                'http_status' => $e->httpStatus,
                'success' => 0,
                'code' => $e->businessCode,
                'message' => $e->getMessage(),
                'error_message' => $e->getMessage(),
                'finished_at' => date('Y-m-d H:i:s'),
            ]);
            throw $e;
        }
    }

    public function syncUnfinished(int $limit = 20, string $source = 'background-compensation'): array
    {
        $taskIds = $this->tasks->unfinishedTaskIds($limit);
        $summary = ['total' => count($taskIds), 'synced' => 0, 'failed' => 0, 'errors' => []];

        foreach ($taskIds as $taskId) {
            try {
                $this->syncOne((string) $taskId, $source);
                $summary['synced']++;
            } catch (\Throwable $e) {
                $summary['failed']++;
                $summary['errors'][] = ['taskId' => $taskId, 'message' => $e->getMessage()];
                Log::error(sprintf('[sync] source=%s task_id=%s failed=true error="%s"', $source, $taskId, addslashes($e->getMessage())));
            }
        }

        return $summary;
    }

    private function hasCompletedItems(array $status): bool
    {
        if ((int) ($status['completedItems'] ?? 0) > 0) {
            return true;
        }

        foreach (($status['subTaskList'] ?? []) as $subtask) {
            if (in_array(($subtask['status'] ?? null), self::TERMINAL_STATUSES, true)) {
                return true;
            }
        }

        return false;
    }
}
