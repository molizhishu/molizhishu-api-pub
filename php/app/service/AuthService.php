<?php
declare(strict_types=1);

namespace app\service;

use RuntimeException;
use think\facade\Db;
use think\Request;

class AuthService
{
    public function login(string $username, string $password, Request $request): array
    {
        $username = trim($username);
        if ($username === '' || $password === '') {
            throw new RuntimeException('请输入账号和密码');
        }

        $user = Db::name('admin_users')->where('username', $username)->find();
        if (!$user || (int) $user['status'] !== 1 || !password_verify($password, (string) $user['password_hash'])) {
            throw new RuntimeException('账号或密码不正确');
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 7 * 86400);
        $now = date('Y-m-d H:i:s');

        Db::name('admin_users')->where('id', $user['id'])->update([
            'auth_token_hash' => hash('sha256', $token),
            'token_expires_at' => $expiresAt,
            'last_login_at' => $now,
            'last_login_ip' => $request->ip(),
            'updated_at' => $now,
        ]);

        return [
            'token' => $token,
            'expiresAt' => $expiresAt,
            'user' => $this->publicUser($user),
        ];
    }

    public function authenticate(Request $request): ?array
    {
        $token = $this->bearerToken($request);
        if ($token === null) {
            return null;
        }

        $user = Db::name('admin_users')
            ->where('auth_token_hash', hash('sha256', $token))
            ->where('status', 1)
            ->find();

        if (!$user) {
            return null;
        }

        $expiresAt = strtotime((string) ($user['token_expires_at'] ?? ''));
        if (!$expiresAt || $expiresAt < time()) {
            return null;
        }

        return $user;
    }

    public function logout(Request $request): void
    {
        $user = $this->authenticate($request);
        if (!$user) {
            return;
        }

        Db::name('admin_users')->where('id', $user['id'])->update([
            'auth_token_hash' => null,
            'token_expires_at' => null,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function publicUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'username' => (string) $user['username'],
            'displayName' => (string) $user['display_name'],
            'role' => (string) $user['role'],
        ];
    }

    private function bearerToken(Request $request): ?string
    {
        $header = trim((string) $request->header('authorization', ''));
        if ($header === '' || !preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            return null;
        }

        $token = trim($matches[1]);
        return $token === '' ? null : $token;
    }
}
