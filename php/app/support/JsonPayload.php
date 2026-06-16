<?php
declare(strict_types=1);

namespace app\support;

/**
 * Helpers for persisting remote JSON payloads consistently.
 */
class JsonPayload
{
    public static function encode(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: 'null';
    }

    public static function remoteTime(mixed $timestamp): ?int
    {
        if (!$timestamp) {
            return null;
        }

        return (int) $timestamp;
    }

    public static function hasRichSubtaskPayload(array $subtask): bool
    {
        foreach ([
            'time',
            'pageScreenshot',
            'answerContent',
            'referenceList',
            'citationList',
            'reasoningProcess',
            'recommendedQuestions',
            'mediaContent',
            'errorMessage',
            'proxyIp',
        ] as $key) {
            if (array_key_exists($key, $subtask)) {
                return true;
            }
        }

        return false;
    }
}
