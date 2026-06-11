<?php

use think\facade\Env;

return [
    'base_url' => rtrim((string) Env::get('molizhishu.base_url', 'https://business-api.molizhishu.com/api/business/monitor'), '/'),
    'city_url' => Env::get('molizhishu.city_url', 'https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info'),
    'token' => Env::get('molizhishu.token', ''),
    'callback_url' => Env::get('molizhishu.callback_url', null),
    'allow_api_key_update' => filter_var(Env::get('molizhishu.allow_api_key_update', true), FILTER_VALIDATE_BOOLEAN),
    'timeout' => (int) Env::get('molizhishu.timeout', 30),
    'callback_max_bytes' => (int) Env::get('molizhishu.callback_max_bytes', 5242880),
];
