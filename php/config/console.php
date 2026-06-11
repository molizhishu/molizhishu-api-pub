<?php

return [
    'commands' => [
        'molizhishu:sync-pending' => app\command\SyncPendingTasks::class,
        'molizhishu:sync-loop' => app\command\SyncPendingLoop::class,
    ],
];
