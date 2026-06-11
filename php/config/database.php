<?php

use think\facade\Env;

return [
    'default' => Env::get('database.type', 'mysql'),
    'connections' => [
        'mysql' => [
            'type' => Env::get('database.type', 'mysql'),
            'hostname' => Env::get('database.host', '127.0.0.1'),
            'database' => Env::get('database.name', 'molizhishu'),
            'username' => Env::get('database.user', 'root'),
            'password' => Env::get('database.password', ''),
            'hostport' => Env::get('database.port', '3306'),
            'charset' => Env::get('database.charset', 'utf8mb4'),
            'prefix' => '',
            'debug' => Env::get('app_debug', false),
            'fields_strict' => true,
            'break_reconnect' => true,
        ],
        'sqlite' => [
            'type' => 'sqlite',
            'database' => Env::get('database.name', runtime_path() . 'molizhishu.sqlite'),
            'prefix' => '',
            'debug' => Env::get('app_debug', false),
        ],
    ],
];
