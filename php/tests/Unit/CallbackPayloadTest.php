<?php
declare(strict_types=1);

namespace tests\Unit;

use app\support\CallbackPayload;
use PHPUnit\Framework\TestCase;

class CallbackPayloadTest extends TestCase
{
    public function testValidPayloadPasses(): void
    {
        $this->assertNull(CallbackPayload::validate([
            'taskId' => 'task_abc',
            'status' => 'completed',
        ]));
    }

    public function testMissingTaskIdFails(): void
    {
        $this->assertSame('taskId 和 status 必填', CallbackPayload::validate([
            'status' => 'completed',
        ]));
    }

    public function testPayloadHashIsStable(): void
    {
        $raw = '{"taskId":"task_abc","status":"completed"}';
        $this->assertSame(hash('sha256', $raw), CallbackPayload::hash($raw));
    }
}
