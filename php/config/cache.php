<?php

return [
    'default' => 'file',
    'stores' => [
        'file' => [
            'type' => 'File',
            'path' => runtime_path() . 'cache',
            'prefix' => '',
            'expire' => 0,
        ],
    ],
];
