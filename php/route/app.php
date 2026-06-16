<?php

use think\facade\Route;

Route::post('api/auth/login', 'AuthController/login');
Route::get('api/health', 'HealthController/index');

Route::post('webhooks/molizhishu', 'CallbackController/receive');

Route::group('api', function () {
    Route::get('auth/me', 'AuthController/me');
    Route::post('auth/logout', 'AuthController/logout');

    Route::get('tasks/:taskId', 'TaskController/read');
    Route::put('tasks/:taskId/stop', 'TaskController/stop');
    Route::post('tasks/:taskId/sync', 'TaskController/sync');
    Route::post('tasks', 'TaskController/create');
    Route::get('tasks', 'TaskController/index');

    Route::get('callback-url', 'CallbackUrlController/read');
    Route::put('callback-url', 'CallbackUrlController/update');

    Route::get('cities', 'CityController/index');

    Route::get('settings', 'SettingsController/read');
    Route::put('settings/api-key', 'SettingsController/update');
})->middleware(\app\middleware\AuthMiddleware::class);
