<?php
declare(strict_types=1);

namespace app\middleware;

use app\service\AuthService;
use Closure;
use think\Request;
use think\Response;

class AuthMiddleware
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (!$this->auth->authenticate($request)) {
            return json(['success' => false, 'message' => '请先登录'], 401);
        }

        return $next($request);
    }
}
