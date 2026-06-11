<?php
declare(strict_types=1);

namespace app\controller;

use app\service\TaskRepository;
use app\support\CallbackPayload;
use think\facade\Config;
use think\facade\Log;
use think\Request;
use think\Response;

class CallbackController
{
    public function __construct(private readonly TaskRepository $tasks)
    {
    }

    public function receive(Request $request): Response
    {
        $raw = $request->getContent();
        $maxBytes = (int) Config::get('molizhishu.callback_max_bytes', 5242880);

        if (strlen($raw) > $maxBytes) {
            Log::warning(sprintf('[callback] rejected=true reason=payload-too-large bytes=%d max=%d', strlen($raw), $maxBytes));
            return json(['success' => false, 'message' => 'payload too large'], 413);
        }

        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            Log::warning('[callback] rejected=true reason=invalid-json');
            return json(['success' => false, 'message' => 'invalid json'], 400);
        }

        $validationError = CallbackPayload::validate($payload);
        if ($validationError !== null) {
            Log::warning('[callback] rejected=true reason=missing-taskId-or-status');
            return json(['success' => false, 'message' => $validationError], 422);
        }

        $hash = CallbackPayload::hash($raw);

        try {
            $result = $this->tasks->applyCallbackPayload($payload, $hash);
            Log::info(sprintf(
                '[callback] task_id=%s status=%s total=%s completed=%s failed=%s duplicate=%s saved=true',
                $payload['taskId'],
                $payload['status'],
                $payload['totalItems'] ?? 0,
                $payload['completedItems'] ?? 0,
                $payload['failedItems'] ?? 0,
                $result['duplicate'] ? 'true' : 'false'
            ));

            return json(['success' => true, 'duplicate' => $result['duplicate']]);
        } catch (\Throwable $e) {
            Log::error(sprintf('[callback] task_id=%s saved=false error="%s"', $payload['taskId'], addslashes($e->getMessage())));
            return json(['success' => false, 'message' => 'callback process failed'], 500);
        }
    }
}
