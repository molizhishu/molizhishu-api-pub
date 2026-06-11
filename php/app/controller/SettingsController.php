<?php
declare(strict_types=1);

namespace app\controller;

use app\service\EnvFileService;
use think\facade\Config;
use think\Request;
use think\Response;

class SettingsController
{
    public function __construct(private readonly EnvFileService $env)
    {
    }

    public function read(): Response
    {
        $token = $this->env->get('MOLIZHISHU_TOKEN') ?: (string) Config::get('molizhishu.token', '');
        $allowApiKeyUpdate = (bool) Config::get('molizhishu.allow_api_key_update', false);

        return json([
            'success' => true,
            'data' => [
                'apiKey' => $this->env->mask($token),
                'security' => [
                    'apiKeyUpdateAllowed' => $allowApiKeyUpdate,
                ],
            ],
        ]);
    }

    public function update(Request $request): Response
    {
        if (!(bool) Config::get('molizhishu.allow_api_key_update', false)) {
            return json(['success' => false, 'message' => '当前环境禁止在页面修改 API Key'], 403);
        }

        $apiKey = trim((string) $request->param('apiKey', ''));
        if ($apiKey === '') {
            return json(['success' => false, 'message' => 'API Key 不能为空'], 422);
        }

        if (!preg_match('/^[A-Za-z0-9._-]{16,256}$/', $apiKey)) {
            return json(['success' => false, 'message' => 'API Key 格式不正确'], 422);
        }

        $this->env->set('MOLIZHISHU_TOKEN', $apiKey);
        Config::set(['token' => $apiKey], 'molizhishu');

        return json([
            'success' => true,
            'data' => [
                'apiKey' => $this->env->mask($apiKey),
                'security' => [
                    'apiKeyUpdateAllowed' => true,
                ],
            ],
        ]);
    }
}
