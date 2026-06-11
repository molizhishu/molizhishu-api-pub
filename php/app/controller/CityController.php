<?php
declare(strict_types=1);

namespace app\controller;

use app\exception\MolizhishuApiException;
use app\service\MolizhishuClient;
use think\Response;

class CityController
{
    public function __construct(private readonly MolizhishuClient $client)
    {
    }

    public function index(): Response
    {
        try {
            return json(['success' => true, 'data' => $this->client->getCities()]);
        } catch (MolizhishuApiException $e) {
            return json(['success' => false, 'code' => $e->businessCode, 'message' => $e->getMessage()], 502);
        }
    }
}
