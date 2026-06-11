<?php
declare(strict_types=1);

namespace app\support;

class CallbackPayload
{
    public static function validate(array $payload): ?string
    {
        if (empty($payload['taskId'])) {
            return 'taskId 和 status 必填';
        }

        if (empty($payload['status'])) {
            return 'taskId 和 status 必填';
        }

        return null;
    }

    public static function hash(string $raw): string
    {
        return hash('sha256', $raw);
    }
}
