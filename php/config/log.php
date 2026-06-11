<?php

return [
    'default' => 'file',
    'channels' => [
        'file' => [
            'type' => 'File',
            'path' => runtime_path() . 'log',
            'single' => false,
            'apart_level' => ['error', 'warning'],
            'max_files' => 30,
        ],
    ],
];
