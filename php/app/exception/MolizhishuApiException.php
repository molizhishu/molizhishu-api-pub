<?php
declare(strict_types=1);

namespace app\exception;

use RuntimeException;

class MolizhishuApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $businessCode = null,
        public readonly ?int $httpStatus = null,
        public readonly ?string $responseBody = null
    ) {
        parent::__construct($message, $businessCode ?? 0);
    }
}
