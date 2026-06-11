<?php
declare(strict_types=1);

namespace app\controller;

use app\exception\MolizhishuApiException;
use app\service\MolizhishuClient;
use think\Request;
use think\Response;

class CallbackUrlController
{
    public function __construct(private readonly MolizhishuClient $client)
    {
    }

    public function read(): Response
    {
        try {
            return json(['success' => true, 'data' => $this->client->getCallbackUrl()]);
        } catch (MolizhishuApiException $e) {
            return json(['success' => false, 'code' => $e->businessCode, 'message' => $e->getMessage()], 502);
        }
    }

    public function update(Request $request): Response
    {
        $callbackUrl = $request->param('callbackUrl', null);
        if ($callbackUrl !== null && !is_string($callbackUrl)) {
            return json(['success' => false, 'message' => 'callbackUrl 必须是字符串或 null'], 422);
        }

        try {
            return json(['success' => true, 'data' => $this->client->updateCallbackUrl($callbackUrl)]);
        } catch (MolizhishuApiException $e) {
            return json(['success' => false, 'code' => $e->businessCode, 'message' => $e->getMessage()], 502);
        }
    }
}
