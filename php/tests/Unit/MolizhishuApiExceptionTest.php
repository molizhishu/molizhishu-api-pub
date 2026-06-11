<?php
declare(strict_types=1);

namespace tests\Unit;

use app\exception\MolizhishuApiException;
use PHPUnit\Framework\TestCase;

class MolizhishuApiExceptionTest extends TestCase
{
    public function testBusinessErrorKeepsCodeAndBody(): void
    {
        $exception = new MolizhishuApiException('Token失效', 500, 200, '{"success":false,"code":500,"message":"Token失效"}');

        $this->assertSame('Token失效', $exception->getMessage());
        $this->assertSame(500, $exception->businessCode);
        $this->assertSame(200, $exception->httpStatus);
        $this->assertStringContainsString('Token失效', $exception->responseBody);
    }
}
