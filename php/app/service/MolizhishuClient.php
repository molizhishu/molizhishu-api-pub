<?php
declare(strict_types=1);

namespace app\service;

use app\exception\MolizhishuApiException;
use think\facade\Config;
use think\facade\Log;

class MolizhishuClient
{
    private string $baseUrl;
    private string $cityUrl;
    private int $timeout;

    public function __construct(private readonly ?EnvFileService $env = null)
    {
        $this->baseUrl = rtrim((string) Config::get('molizhishu.base_url'), '/');
        $this->cityUrl = (string) Config::get('molizhishu.city_url');
        $this->timeout = (int) Config::get('molizhishu.timeout', 30);
    }

    public function submitTask(array $payload, string $source = 'local-api:submit-task'): array
    {
        return $this->request('POST', '/task/batch/shared', $payload, $source);
    }

    public function getCallbackUrl(string $source = 'local-api:callback-url:get'): mixed
    {
        return $this->request('GET', '/task/callback-url', null, $source);
    }

    public function updateCallbackUrl(?string $callbackUrl, string $source = 'local-api:callback-url:update'): mixed
    {
        return $this->request('PUT', '/task/callback-url', ['callbackUrl' => $callbackUrl], $source);
    }

    public function getTaskStatus(string $taskId, string $source = 'local-api:manual-compensation:status'): array
    {
        return $this->request('GET', '/task/status/' . rawurlencode($taskId), null, $source);
    }

    public function getTaskResult(string $taskId, string $source = 'local-api:manual-compensation:result'): array
    {
        return $this->request('GET', '/task/result/' . rawurlencode($taskId), null, $source);
    }

    public function stopTask(string $taskId, string $source = 'local-api:stop-task'): mixed
    {
        return $this->request('PUT', '/task/' . rawurlencode($taskId) . '/stop', null, $source);
    }

    public function getCities(string $source = 'local-api:cities'): array
    {
        return $this->request('GET', $this->cityUrl, null, $source, true);
    }

    private function request(string $method, string $pathOrUrl, ?array $payload, string $source, bool $absolute = false): mixed
    {
        $token = $this->env?->get('MOLIZHISHU_TOKEN') ?: (string) Config::get('molizhishu.token', '');
        if ($token === '') {
            throw new MolizhishuApiException('MOLIZHISHU_TOKEN 未配置');
        }

        $url = $absolute ? $pathOrUrl : $this->baseUrl . $pathOrUrl;
        $started = microtime(true);
        $headers = [
            'Accept: application/json',
            'Authorization: Bearer ' . $token,
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        if ($payload !== null) {
            $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [...$headers, 'Content-Type: application/json']);
        }

        $body = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpStatus = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        if (PHP_VERSION_ID < 80500) {
            curl_close($ch);
        }

        $duration = (int) round((microtime(true) - $started) * 1000);

        if ($body === false) {
            Log::error(sprintf('[molizhishu] source=%s method=%s url=%s http_status=0 success=false code=null message="%s" duration=%dms', $source, $method, $url, $curlError, $duration));
            throw new MolizhishuApiException('模力指数接口网络异常：' . $curlError);
        }

        $decoded = json_decode((string) $body, true);
        if (!is_array($decoded)) {
            Log::error(sprintf('[molizhishu] source=%s method=%s url=%s http_status=%d success=false code=null message="invalid-json" duration=%dms', $source, $method, $url, $httpStatus, $duration));
            throw new MolizhishuApiException('模力指数接口返回非 JSON', null, $httpStatus, (string) $body);
        }

        $success = (bool) ($decoded['success'] ?? false);
        $code = isset($decoded['code']) ? (int) $decoded['code'] : null;
        $message = (string) ($decoded['message'] ?? '');
        Log::info(sprintf('[molizhishu] source=%s method=%s url=%s http_status=%d success=%s code=%s message="%s" duration=%dms', $source, $method, $url, $httpStatus, $success ? 'true' : 'false', $code === null ? 'null' : (string) $code, addslashes($message), $duration));

        if ($httpStatus < 200 || $httpStatus >= 300) {
            throw new MolizhishuApiException('模力指数 HTTP 异常：' . $httpStatus, $code, $httpStatus, (string) $body);
        }

        if (!$success) {
            throw new MolizhishuApiException($message !== '' ? $message : '模力指数业务处理失败', $code, $httpStatus, (string) $body);
        }

        return $decoded['data'] ?? null;
    }
}
