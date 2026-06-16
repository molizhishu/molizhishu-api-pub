<?php
declare(strict_types=1);

namespace app\controller;

use think\Response;

class HealthController
{
    public function index(): Response
    {
        return json([
            'success' => true,
            'data' => [
                'status' => 'ok',
                'service' => 'molizhishu-api-pub-php',
            ],
        ]);
    }
}
