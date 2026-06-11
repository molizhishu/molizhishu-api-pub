<?php
declare(strict_types=1);

namespace app\service;

use RuntimeException;

class EnvFileService
{
    public function envPath(): string
    {
        return root_path() . '.env';
    }

    public function get(string $key): ?string
    {
        $path = $this->envPath();
        if (!is_file($path)) {
            return null;
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
            if (preg_match('/^\s*' . preg_quote($key, '/') . '\s*=\s*(.*)\s*$/', $line, $matches)) {
                return $this->unquote($matches[1]);
            }
        }

        return null;
    }

    public function set(string $key, ?string $value): void
    {
        $path = $this->envPath();
        $lines = is_file($path) ? (file($path, FILE_IGNORE_NEW_LINES) ?: []) : [];
        $nextLine = $key . '=' . $this->quote($value ?? '');
        $found = false;

        foreach ($lines as $index => $line) {
            if (preg_match('/^\s*' . preg_quote($key, '/') . '\s*=/', $line)) {
                $lines[$index] = $nextLine;
                $found = true;
                break;
            }
        }

        if (!$found) {
            if ($lines !== [] && trim((string) end($lines)) !== '') {
                $lines[] = '';
            }
            $lines[] = $nextLine;
        }

        $content = implode(PHP_EOL, $lines) . PHP_EOL;
        if (file_put_contents($path, $content, LOCK_EX) === false) {
            throw new RuntimeException('.env 写入失败');
        }

        putenv($key . '=' . ($value ?? ''));
        $_ENV[$key] = $value ?? '';
        $_SERVER[$key] = $value ?? '';
    }

    public function mask(?string $value): array
    {
        $value = trim((string) $value);
        if ($value === '') {
            return ['configured' => false, 'masked' => null, 'last4' => null];
        }

        $last4 = substr($value, -4);
        return [
            'configured' => true,
            'masked' => str_repeat('*', max(8, strlen($value) - 4)) . $last4,
            'last4' => $last4,
        ];
    }

    private function quote(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/\s|#|"/', $value)) {
            return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $value) . '"';
        }

        return $value;
    }

    private function unquote(string $value): string
    {
        $value = trim($value);
        if (strlen($value) >= 2 && $value[0] === '"' && $value[strlen($value) - 1] === '"') {
            return str_replace(['\\"', '\\\\'], ['"', '\\'], substr($value, 1, -1));
        }

        return $value;
    }
}
