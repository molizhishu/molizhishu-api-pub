<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuthService;
use RuntimeException;
use think\Request;
use think\Response;

class AuthController
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    public function login(Request $request): Response
    {
        try {
            $data = $this->auth->login(
                (string) $request->param('username', ''),
                (string) $request->param('password', ''),
                $request
            );

            return json(['success' => true, 'data' => $data]);
        } catch (RuntimeException $e) {
            return json(['success' => false, 'message' => $e->getMessage()], 401);
        }
    }

    public function me(Request $request): Response
    {
        $user = $this->auth->authenticate($request);
        if (!$user) {
            return json(['success' => false, 'message' => '登录已失效'], 401);
        }

        return json(['success' => true, 'data' => $this->auth->publicUser($user)]);
    }

    public function logout(Request $request): Response
    {
        $this->auth->logout($request);

        return json(['success' => true, 'data' => true]);
    }
}
