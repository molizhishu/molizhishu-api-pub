<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

class TaskRepository
{
    public function saveSubmittedTask(array $request, array $response): void
    {
        $taskId = (string) $response['taskId'];
        $now = date('Y-m-d H:i:s');
        $task = [
            'task_id' => $taskId,
            'status' => (string) ($response['status'] ?? 'pending'),
            'prompts_json' => $this->json($request['prompts'] ?? []),
            'platforms_json' => $this->json($request['platforms'] ?? []),
            'region_code_json' => $this->json($request['regionCode'] ?? []),
            'callback_url' => $response['callbackUrl'] ?? ($request['callbackUrl'] ?? null),
            'total_items' => (int) ($response['totalTask'] ?? $response['totalItems'] ?? 0),
            'completed_items' => 0,
            'failed_items' => 0,
            'poll_url' => $response['pollUrl'] ?? null,
            'raw_request_json' => $this->json($request),
            'raw_response_json' => $this->json($response),
            'last_error' => null,
            'created_local_at' => $now,
            'updated_at' => $now,
        ];

        Db::transaction(function () use ($taskId, $task, $response, $now): void {
            if (Db::name('tasks')->where('task_id', $taskId)->find()) {
                unset($task['created_local_at']);
                Db::name('tasks')->where('task_id', $taskId)->update($task);
            } else {
                Db::name('tasks')->insert($task);
            }

            foreach (($response['subTaskList'] ?? []) as $subtask) {
                $this->upsertSubtask($taskId, $subtask, $now);
            }
        });
    }

    public function applyCallbackPayload(array $payload, string $payloadHash): array
    {
        $taskId = (string) $payload['taskId'];
        $now = date('Y-m-d H:i:s');

        return Db::transaction(function () use ($payload, $payloadHash, $taskId, $now): array {
            $existingEvent = Db::name('callback_events')
                ->where('task_id', $taskId)
                ->where('payload_hash', $payloadHash)
                ->find();

            if ($existingEvent && $existingEvent['process_status'] === 'processed') {
                Db::name('callback_events')->insert([
                    'task_id' => $taskId,
                    'payload_json' => $this->json($payload),
                    'payload_hash' => $payloadHash,
                    'process_status' => 'duplicate',
                    'error_message' => null,
                    'received_at' => $now,
                    'processed_at' => $now,
                ]);
                return ['duplicate' => true, 'subtasks' => 0];
            }

            $eventId = Db::name('callback_events')->insertGetId([
                'task_id' => $taskId,
                'payload_json' => $this->json($payload),
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
                'completed_at' => $this->remoteTime($payload['timestamp'] ?? null),
                'raw_response_json' => $this->json($payload),
                'last_error' => null,
                'updated_at' => $now,
            ];

            if (Db::name('tasks')->where('task_id', $taskId)->find()) {
                Db::name('tasks')->where('task_id', $taskId)->update($task);
            } else {
                $task += [
                    'prompts_json' => $this->json([]),
                    'platforms_json' => $this->json([]),
                    'region_code_json' => $this->json([]),
                    'callback_url' => null,
                    'poll_url' => null,
                    'raw_request_json' => $this->json([]),
                    'created_local_at' => $now,
                ];
                Db::name('tasks')->insert($task);
            }

            $count = 0;
            foreach (($payload['subTaskList'] ?? []) as $subtask) {
                $this->upsertSubtask($taskId, $subtask, $now);
                $count++;
            }

            Db::name('callback_events')->where('id', $eventId)->update([
                'process_status' => 'processed',
                'processed_at' => $now,
            ]);

            return ['duplicate' => false, 'subtasks' => $count];
        });
    }

    public function applyRemoteStatus(string $taskId, array $status): void
    {
        $now = date('Y-m-d H:i:s');
        $data = [
            'task_id' => $taskId,
            'status' => (string) ($status['status'] ?? 'processing'),
            'total_items' => (int) ($status['totalItems'] ?? $status['totalTask'] ?? 0),
            'completed_items' => (int) ($status['completedItems'] ?? 0),
            'failed_items' => (int) ($status['failedItems'] ?? 0),
            'raw_response_json' => $this->json($status),
            'updated_at' => $now,
        ];

        Db::transaction(function () use ($taskId, $status, $data, $now): void {
            if (Db::name('tasks')->where('task_id', $taskId)->find()) {
                Db::name('tasks')->where('task_id', $taskId)->update($data);
            } else {
                Db::name('tasks')->insert($data + [
                    'prompts_json' => $this->json([]),
                    'platforms_json' => $this->json([]),
                    'region_code_json' => $this->json([]),
                    'callback_url' => null,
                    'poll_url' => null,
                    'raw_request_json' => $this->json([]),
                    'created_local_at' => $now,
                ]);
            }

            foreach (($status['subTaskList'] ?? []) as $subtask) {
                $this->upsertSubtask($taskId, $subtask, $now);
            }
        });
    }

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
                'completed_at' => $this->remoteTime($payload['completedAt'] ?? $payload['timestamp'] ?? null),
                'raw_response_json' => $this->json($payload),
                'last_error' => null,
                'updated_at' => $now,
            ];

            if (Db::name('tasks')->where('task_id', $taskId)->find()) {
                Db::name('tasks')->where('task_id', $taskId)->update($task);
            } else {
                Db::name('tasks')->insert($task + [
                    'prompts_json' => $this->json([]),
                    'platforms_json' => $this->json([]),
                    'region_code_json' => $this->json([]),
                    'callback_url' => null,
                    'poll_url' => null,
                    'raw_request_json' => $this->json([]),
                    'created_local_at' => $now,
                ]);
            }

            foreach (($payload['subTaskList'] ?? []) as $subtask) {
                $this->upsertSubtask($taskId, $subtask, $now);
            }
        });
    }

    public function unfinishedTaskIds(int $limit = 20): array
    {
        $limit = max(1, $limit);
        $terminal = "'completed','partial_completed','failed','stopped'";

        return array_column(Db::query(
            "SELECT t.task_id
             FROM tasks t
             LEFT JOIN subtasks s ON s.task_id = t.task_id
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

    public function paginateTasks(int $page, int $size, ?string $status): array
    {
        $query = Db::name('tasks')->order('created_local_at', 'desc');
        if ($status) {
            $query->where('status', $status);
        }

        $total = (clone $query)->count();
        $items = $query->page($page, $size)->select()->toArray();
        return ['page' => $page, 'size' => $size, 'total' => $total, 'items' => $items];
    }

    public function getTaskDetail(string $taskId): ?array
    {
        $task = Db::name('tasks')->where('task_id', $taskId)->find();
        if (!$task) {
            return null;
        }

        $task['subTaskList'] = Db::name('subtasks')->where('task_id', $taskId)->order('updated_at', 'desc')->select()->toArray();
        $task['callbackEvents'] = Db::name('callback_events')->where('task_id', $taskId)->order('received_at', 'desc')->limit(20)->select()->toArray();
        return $task;
    }

    private function upsertSubtask(string $taskId, array $subtask, string $now): void
    {
        $subTaskId = (string) ($subtask['subTaskId'] ?? '');
        if ($subTaskId === '') {
            return;
        }

        $existing = Db::name('subtasks')->where('subtask_id', $subTaskId)->find();
        $data = [
            'subtask_id' => $subTaskId,
            'task_id' => $taskId,
            'platform' => $subtask['platform'] ?? null,
            'mode' => $subtask['mode'] ?? null,
            'prompt' => $subtask['prompt'] ?? null,
            'status' => $subtask['status'] ?? null,
            'updated_at' => $now,
        ];

        if (!$existing || array_key_exists('time', $subtask)) {
            $data['time'] = isset($subtask['time']) ? (string) $subtask['time'] : null;
        }
        if (!$existing || array_key_exists('pageScreenshot', $subtask)) {
            $data['page_screenshot'] = $subtask['pageScreenshot'] ?? null;
        }
        if (!$existing || array_key_exists('answerContent', $subtask)) {
            $data['answer_content'] = $subtask['answerContent'] ?? null;
        }
        if (!$existing || array_key_exists('referenceList', $subtask)) {
            $data['reference_list_json'] = $this->json($subtask['referenceList'] ?? []);
        }
        if (!$existing || array_key_exists('citationList', $subtask)) {
            $data['citation_list_json'] = $this->json($subtask['citationList'] ?? []);
        }
        if (!$existing || array_key_exists('reasoningProcess', $subtask)) {
            $data['reasoning_process_json'] = $this->json($subtask['reasoningProcess'] ?? null);
        }
        if (!$existing || array_key_exists('recommendedQuestions', $subtask)) {
            $data['recommended_questions_json'] = $this->json($subtask['recommendedQuestions'] ?? []);
        }
        if (!$existing || array_key_exists('mediaContent', $subtask)) {
            $data['media_content_json'] = $this->json($subtask['mediaContent'] ?? []);
        }
        if (!$existing || array_key_exists('errorMessage', $subtask)) {
            $data['error_message'] = $subtask['errorMessage'] ?? null;
        }
        if (!$existing || array_key_exists('proxyIp', $subtask)) {
            $data['proxy_ip'] = $subtask['proxyIp'] ?? null;
        }
        if (!$existing || $this->hasRichSubtaskPayload($subtask)) {
            $data['raw_result_json'] = $this->json($subtask);
        }

        if ($existing) {
            Db::name('subtasks')->where('subtask_id', $subTaskId)->update($data);
        } else {
            Db::name('subtasks')->insert($data);
        }
    }

    private function hasRichSubtaskPayload(array $subtask): bool
    {
        foreach ([
            'time',
            'pageScreenshot',
            'answerContent',
            'referenceList',
            'citationList',
            'reasoningProcess',
            'recommendedQuestions',
            'mediaContent',
            'errorMessage',
            'proxyIp',
        ] as $key) {
            if (array_key_exists($key, $subtask)) {
                return true;
            }
        }
        return false;
    }

    private function remoteTime(mixed $timestamp): ?string
    {
        if (!$timestamp) {
            return null;
        }

        return date('Y-m-d H:i:s', (int) floor(((int) $timestamp) / 1000));
    }

    private function json(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
