<?php

use think\facade\Env;

return [
    'app_debug' => Env::get('app_debug', false),
    'default_timezone' => 'Asia/Shanghai',
    'show_error_msg' => Env::get('app_debug', false),
];
