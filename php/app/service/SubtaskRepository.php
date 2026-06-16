<?php
declare(strict_types=1);

namespace app\service;

use app\support\JsonPayload;
use think\facade\Db;

/**
 * Persists Molizhishu subtask snapshots and final result payloads.
 */
class SubtaskRepository
{
    /**
     * Upserts one subtask while preserving rich result fields when only status
     * summary data is received.
     */
    public function upsertFromPayload(string $taskId, array $subtask, string $now): void
    {
        $subTaskId = (string) ($subtask['subTaskId'] ?? '');
        if ($subTaskId === '') {
            return;
        }

        $existing = Db::name('geo_subtasks')->where('subtask_id', $subTaskId)->find();
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
            $data['time'] = isset($subtask['time']) ? (int) $subtask['time'] : null;
        }
        if (!$existing || array_key_exists('pageScreenshot', $subtask)) {
            $data['page_screenshot'] = $subtask['pageScreenshot'] ?? null;
        }
        if (!$existing || array_key_exists('answerContent', $subtask)) {
            $data['answer_content'] = $subtask['answerContent'] ?? null;
        }
        if (!$existing || array_key_exists('referenceList', $subtask)) {
            $data['reference_list_json'] = JsonPayload::encode($subtask['referenceList'] ?? []);
        }
        if (!$existing || array_key_exists('citationList', $subtask)) {
            $data['citation_list_json'] = JsonPayload::encode($subtask['citationList'] ?? []);
        }
        if (!$existing || array_key_exists('reasoningProcess', $subtask)) {
            $data['reasoning_process_json'] = JsonPayload::encode($subtask['reasoningProcess'] ?? null);
        }
        if (!$existing || array_key_exists('recommendedQuestions', $subtask)) {
            $data['recommended_questions_json'] = JsonPayload::encode($subtask['recommendedQuestions'] ?? []);
        }
        if (!$existing || array_key_exists('mediaContent', $subtask)) {
            $data['media_content_json'] = JsonPayload::encode($subtask['mediaContent'] ?? []);
        }
        if (!$existing || array_key_exists('errorMessage', $subtask)) {
            $data['error_message'] = $subtask['errorMessage'] ?? null;
        }
        if (!$existing || array_key_exists('proxyIp', $subtask)) {
            $data['proxy_ip'] = $subtask['proxyIp'] ?? null;
        }
        if (!$existing || JsonPayload::hasRichSubtaskPayload($subtask)) {
            $data['raw_result_json'] = JsonPayload::encode($subtask);
        }

        if ($existing) {
            Db::name('geo_subtasks')->where('subtask_id', $subTaskId)->update($data);
            return;
        }

        Db::name('geo_subtasks')->insert($data);
    }
}
