<?php
declare(strict_types=1);

namespace app\service;

use app\support\JsonPayload;
use think\facade\Db;

class TaskRepository
{
    public function __construct(private readonly SubtaskRepository $subtasks)
    {
    }

    /**
     * Saves the local task snapshot returned by task submission.
     */
    public function saveSubmittedTask(array $request, array $response): void
    {
        $taskId = (string) $response['taskId'];
        $now = date('Y-m-d H:i:s');
        $task = [
            'task_id' => $taskId,
            'status' => (string) ($response['status'] ?? 'pending'),
            'prompts_json' => JsonPayload::encode($request['prompts'] ?? []),
            'platforms_json' => JsonPayload::encode($request['platforms'] ?? []),
            'region_code_json' => JsonPayload::encode($request['regionCode'] ?? []),
            'callback_url' => $response['callbackUrl'] ?? ($request['callbackUrl'] ?? null),
            'total_items' => (int) ($response['totalTask'] ?? $response['totalItems'] ?? 0),
            'completed_items' => 0,
            'failed_items' => 0,
            'poll_url' => $response['pollUrl'] ?? null,
            'raw_request_json' => JsonPayload::encode($request),
            'raw_response_json' => JsonPayload::encode($response),
            'last_error' => null,
            'created_local_at' => $now,
            'updated_at' => $now,
        ];

        Db::transaction(function () use ($taskId, $task, $response, $now): void {
            if (Db::name('geo_tasks')->where('task_id', $taskId)->find()) {
                unset($task['created_local_at']);
                Db::name('geo_tasks')->where('task_id', $taskId)->update($task);
            } else {
                Db::name('geo_tasks')->insert($task);
            }

            foreach (($response['subTaskList'] ?? []) as $subtask) {
                $this->subtasks->upsertFromPayload($taskId, $subtask, $now);
            }
        });
    }

    /**
     * Applies an idempotent callback payload and returns duplicate/subtask info.
     */
    public function applyCallbackPayload(array $payload, string $payloadHash): array
    {
        $taskId = (string) $payload['taskId'];
        $now = date('Y-m-d H:i:s');

        return Db::transaction(function () use ($payload, $payloadHash, $taskId, $now): array {
            $existingEvent = Db::name('geo_callback_events')
                ->where('task_id', $taskId)
                ->where('payload_hash', $payloadHash)
                ->find();

            if ($existingEvent && $existingEvent['process_status'] === 'processed') {
                Db::name('geo_callback_events')->insert([
                    'task_id' => $taskId,
                    'payload_json' => JsonPayload::encode($payload),
                    'payload_hash' => $payloadHash,
                    'process_status' => 'duplicate',
                    'error_message' => null,
                    'received_at' => $now,
                    'processed_at' => $now,
                ]);
                return ['duplicate' => true, 'subtasks' => 0];
            }

            $eventId = Db::name('geo_callback_events')->insertGetId([
                'task_id' => $taskId,
                'payload_json' => JsonPayload::encode($payload),
                'payload_hash' => $payloadHash,
                'process_status' => 'processing',
                'error_message' => null,
                'received_at' => $now,
                'processed_at' => null,
            ]);

            $task = [
                'task_id' => $taskId,
                'status' => (string) $payload['status'],
                'total_items' => (int) ($payload['totalItems'] ?? 0),
                'completed_items' => (int) ($payload['completedItems'] ?? 0),
                'failed_items' => (int) ($payload['failedItems'] ?? 0),
                'completed_at' => JsonPayload::remoteTime($payload['timestamp'] ?? null),
                'raw_response_json' => JsonPayload::encode($payload),
                'last_error' => null,
                'updated_at' => $now,
            ];

            if (Db::name('geo_tasks')->where('task_id', $taskId)->find()) {
                Db::name('geo_tasks')->where('task_id', $taskId)->update($task);
            } else {
                $task += [
                    'prompts_json' => JsonPayload::encode([]),
                    'platforms_json' => JsonPayload::encode([]),
                    'region_code_json' => JsonPayload::encode([]),
                    'callback_url' => null,
                    'poll_url' => null,
                    'raw_request_json' => JsonPayload::encode([]),
                    'created_local_at' => $now,
                ];
                Db::name('geo_tasks')->insert($task);
            }

            $count = 0;
            foreach (($payload['subTaskList'] ?? []) as $subtask) {
                $this->subtasks->upsertFromPayload($taskId, $subtask, $now);
                $count++;
            }

            Db::name('geo_callback_events')->where('id', $eventId)->update([
                'process_status' => 'processed',
                'processed_at' => $now,
            ]);

            return ['duplicate' => false, 'subtasks' => $count];
        });
    }

    /**
     * Applies a remote status response. This may only contain summary subtasks.
     */
    public function applyRemoteStatus(string $taskId, array $status): void
    {
        $now = date('Y-m-d H:i:s');
        $data = [
            'task_id' => $taskId,
            'status' => (string) ($status['status'] ?? 'processing'),
            'total_items' => (int) ($status['totalItems'] ?? $status['totalTask'] ?? 0),
            'completed_items' => (int) ($status['completedItems'] ?? 0),
            'failed_items' => (int) ($status['failedItems'] ?? 0),
            'raw_response_json' => JsonPayload::encode($status),
            'updated_at' => $now,
        ];

        Db::transaction(function () use ($taskId, $status, $data, $now): void {
            if (Db::name('geo_tasks')->where('task_id', $taskId)->find()) {
                Db::name('geo_tasks')->where('task_id', $taskId)->update($data);
            } else {
                Db::name('geo_tasks')->insert($data + [
                    'prompts_json' => JsonPayload::encode([]),
                    'platforms_json' => JsonPayload::encode([]),
                    'region_code_json' => JsonPayload::encode([]),
                    'callback_url' => null,
                    'poll_url' => null,
                    'raw_request_json' => JsonPayload::encode([]),
                    'created_local_at' => $now,
                ]);
            }

            foreach (($status['subTaskList'] ?? []) as $subtask) {
                $this->subtasks->upsertFromPayload($taskId, $subtask, $now);
            }
        });
    }

    /**
     * Applies a remote result response with complete answer fields when present.
     */
    public function applyRemoteResult(string $taskId, array $result): void
    {
        $payload = $result;
        $payload['taskId'] = $payload['taskId'] ?? $taskId;
        $payload['status'] = $payload['status'] ?? 'completed';

        $now = date('Y-m-d H:i:s');
        Db::transaction(function () use ($taskId, $payload, $now): void {
            $task = [
                'task_id' => $taskId,
                'status' => (string) ($payload['status'] ?? 'completed'),
                'total_items' => (int) ($payload['totalItems'] ?? 0),
                'completed_items' => (int) ($payload['completedItems'] ?? 0),
                'failed_items' => (int) ($payload['failedItems'] ?? 0),
                'completed_at' => JsonPayload::remoteTime($payload['completedAt'] ?? $payload['timestamp'] ?? null),
                'raw_response_json' => JsonPayload::encode($payload),
                'last_error' => null,
                'updated_at' => $now,
            ];

            if (Db::name('geo_tasks')->where('task_id', $taskId)->find()) {
                Db::name('geo_tasks')->where('task_id', $taskId)->update($task);
            } else {
                Db::name('geo_tasks')->insert($task + [
                    'prompts_json' => JsonPayload::encode([]),
                    'platforms_json' => JsonPayload::encode([]),
                    'region_code_json' => JsonPayload::encode([]),
                    'callback_url' => null,
                    'poll_url' => null,
                    'raw_request_json' => JsonPayload::encode([]),
                    'created_local_at' => $now,
                ]);
            }

            foreach (($payload['subTaskList'] ?? []) as $subtask) {
                $this->subtasks->upsertFromPayload($taskId, $subtask, $now);
            }
        });
    }

    /**
     * Returns task IDs that still need compensation polling.
     */
    public function unfinishedTaskIds(int $limit = 20): array
    {
        $limit = max(1, $limit);
        $terminal = "'completed','partial_completed','failed','stopped'";

        return array_column(Db::query(
            "SELECT t.task_id
             FROM geo_tasks t
             LEFT JOIN geo_subtasks s ON s.task_id = t.task_id
             WHERE t.status NOT IN ({$terminal})
                OR s.subtask_id IS NULL
                OR s.status IS NULL
                OR s.status NOT IN ({$terminal})
                OR (
                    t.status IN ('completed', 'partial_completed')
                    AND s.status = 'completed'
                    AND (s.answer_content IS NULL OR s.answer_content = '')
                )
             GROUP BY t.task_id
             ORDER BY MIN(t.created_local_at) ASC
             LIMIT {$limit}"
        ), 'task_id');
    }

    /**
     * Returns a local task page for the frontend without calling remote APIs.
     */
    public function paginateTasks(int $page, int $size, ?string $status): array
    {
        $query = Db::name('geo_tasks')->order('created_local_at', 'desc');
        if ($status) {
            $query->where('status', $status);
        }

        $total = (clone $query)->count();
        $items = $query->page($page, $size)->select()->toArray();
        return ['page' => $page, 'size' => $size, 'total' => $total, 'items' => $items];
    }

    /**
     * Returns one local task with subtasks and recent callback events.
     */
    public function getTaskDetail(string $taskId): ?array
    {
        $task = Db::name('geo_tasks')->where('task_id', $taskId)->find();
        if (!$task) {
            return null;
        }

        $task['subTaskList'] = Db::name('geo_subtasks')->where('task_id', $taskId)->order('updated_at', 'desc')->select()->toArray();
        $task['callbackEvents'] = Db::name('geo_callback_events')->where('task_id', $taskId)->order('received_at', 'desc')->limit(20)->select()->toArray();
        return $task;
    }
}
