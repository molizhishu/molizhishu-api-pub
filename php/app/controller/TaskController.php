<?php
declare(strict_types=1);

namespace app\controller;

use app\exception\MolizhishuApiException;
use app\service\MolizhishuClient;
use app\service\TaskRepository;
use app\service\TaskSyncService;
use think\facade\Config;
use think\facade\Log;
use think\Request;
use think\Response;

class TaskController
{
    public function __construct(
        private readonly MolizhishuClient $client,
        private readonly TaskRepository $tasks,
        private readonly TaskSyncService $syncService
    ) {
    }

    public function create(Request $request): Response
    {
        $started = microtime(true);
        $payload = $request->param();

        $error = $this->validateSubmitPayload($payload);
        if ($error !== null) {
            return json(['success' => false, 'message' => $error], 422);
        }

        if (empty($payload['callbackUrl'])) {
            $callbackUrl = Config::get('molizhishu.callback_url');
            if ($callbackUrl) {
                $payload['callbackUrl'] = $callbackUrl;
            } else {
                Log::warning('[local] source=local-api:submit-task callback_url=null message="task will not receive callback"');
            }
        }

        try {
            $data = $this->client->submitTask($payload);
            $this->tasks->saveSubmittedTask($payload, $data);
            return json(['success' => true, 'data' => $data]);
        } catch (MolizhishuApiException $e) {
            return json([
                'success' => false,
                'code' => $e->businessCode,
                'message' => $e->getMessage(),
            ], $e->httpStatus && $e->httpStatus >= 400 ? $e->httpStatus : 502);
        } finally {
            $duration = (int) round((microtime(true) - $started) * 1000);
            Log::info(sprintf('[local] method=POST path=/api/tasks duration=%dms', $duration));
        }
    }

    public function index(Request $request): Response
    {
        $started = microtime(true);
        $page = max(1, (int) $request->get('page', 1));
        $size = min(100, max(1, (int) $request->get('size', 20)));
        $status = $request->get('status');

        try {
            return json(['success' => true, 'data' => $this->tasks->paginateTasks($page, $size, $status ?: null)]);
        } finally {
            $duration = (int) round((microtime(true) - $started) * 1000);
            Log::info(sprintf('[local] method=GET path=/api/tasks source=local-read duration=%dms', $duration));
        }
    }

    public function read(string $taskId): Response
    {
        $started = microtime(true);
        try {
            $task = $this->tasks->getTaskDetail($taskId);
            if (!$task) {
                return json(['success' => false, 'message' => '任务不存在'], 404);
            }
            return json(['success' => true, 'data' => $task]);
        } finally {
            $duration = (int) round((microtime(true) - $started) * 1000);
            Log::info(sprintf('[local] method=GET path=/api/tasks/%s source=local-read duration=%dms', $taskId, $duration));
        }
    }

    public function sync(string $taskId): Response
    {
        $started = microtime(true);
        try {
            return json(['success' => true, 'data' => $this->syncService->syncOne($taskId)]);
        } catch (MolizhishuApiException $e) {
            return json([
                'success' => false,
                'code' => $e->businessCode,
                'message' => $e->getMessage(),
            ], $e->httpStatus && $e->httpStatus >= 400 ? $e->httpStatus : 502);
        } finally {
            $duration = (int) round((microtime(true) - $started) * 1000);
            Log::info(sprintf('[local] method=POST path=/api/tasks/%s/sync source=local-api:manual-compensation duration=%dms', $taskId, $duration));
        }
    }

    public function stop(string $taskId): Response
    {
        $started = microtime(true);
        try {
            $stopResult = $this->client->stopTask($taskId);
            $syncResult = $this->syncService->syncOne($taskId, 'local-api:stop-task:sync-after-stop');

            return json([
                'success' => true,
                'data' => [
                    'message' => $stopResult,
                    'sync' => $syncResult,
                ],
            ]);
        } catch (MolizhishuApiException $e) {
            return json([
                'success' => false,
                'code' => $e->businessCode,
                'message' => $e->getMessage(),
            ], $e->httpStatus && $e->httpStatus >= 400 ? $e->httpStatus : 502);
        } finally {
            $duration = (int) round((microtime(true) - $started) * 1000);
            Log::info(sprintf('[local] method=PUT path=/api/tasks/%s/stop source=local-api:stop-task duration=%dms', $taskId, $duration));
        }
    }

    private function validateSubmitPayload(array $payload): ?string
    {
        if (empty($payload['prompts']) || !is_array($payload['prompts'])) {
            return 'prompts 必须是非空数组';
        }
        if (count($payload['prompts']) > 50) {
            return 'prompts 最多 50 个';
        }
        if (empty($payload['platforms']) || !is_array($payload['platforms'])) {
            return 'platforms 必须是非空数组';
        }
        foreach ($payload['platforms'] as $platform) {
            if (empty($platform['platform']) || empty($platform['mode'])) {
                return 'platforms 每一项必须包含 platform 和 mode';
            }
        }
        return null;
    }
}
