import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, saveAuth } from '../api';
import logoUrl from '../assets/molizhishu-logo.png';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(localStorage.getItem('molizhishu_remember_user') === '1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('molizhishu_saved_username');
    if (saved) {
      setUsername(saved);
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await api.login({ username: username.trim(), password });
      saveAuth(result);
      if (remember) {
        localStorage.setItem('molizhishu_remember_user', '1');
        localStorage.setItem('molizhishu_saved_username', username.trim());
      } else {
        localStorage.removeItem('molizhishu_remember_user');
        localStorage.removeItem('molizhishu_saved_username');
      }

      const fallback = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      const from = (location.state as { from?: string } | null)?.from || fallback;
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <AnimatedLoginBackground />
      <div className="loginCard">
        <div className="loginBrand">
          <div className="loginLogo">
            <img src={logoUrl} alt="模力指数" />
          </div>
          <div>
            <h1>模力指数监控台</h1>
            <p>Monitor Console</p>
          </div>
        </div>

        <form className="loginForm" onSubmit={submit}>
          <label>
            账号
            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError('');
              }}
              placeholder="请输入账号"
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label>
            密码
            <div className="passwordField">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder="请输入密码"
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="切换密码显示">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="loginOptions">
            <label className="rememberCheck">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>记住账号</span>
            </label>
            <span>默认账号：admin</span>
          </div>

          {error && (
            <div className="loginError">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button className="loginButton" disabled={loading}>
            {loading ? <Loader2 size={18} className="spinIcon" /> : null}
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AnimatedLoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const canvasContext = canvasElement?.getContext('2d');
    if (!canvasElement || !canvasContext) {
      return;
    }
    const canvas = canvasElement;
    const context = canvasContext;

    let frame = 0;
    let animationId = 0;
    const particles = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      radius: Math.random() * 1.8 + 0.7,
    }));

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function draw() {
      frame += 1;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'rgba(34, 197, 94, 0.26)';
      context.strokeStyle = 'rgba(34, 197, 94, 0.12)';

      particles.forEach((point, index) => {
        point.x += point.vx;
        point.y += point.vy;
        if (point.x <= 0 || point.x >= 1) point.vx *= -1;
        if (point.y <= 0 || point.y >= 1) point.vy *= -1;

        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        context.beginPath();
        context.arc(x, y, point.radius, 0, Math.PI * 2);
        context.fill();

        for (let next = index + 1; next < particles.length; next += 1) {
          const other = particles[next];
          const ox = other.x * canvas.width;
          const oy = other.y * canvas.height;
          const distance = Math.hypot(x - ox, y - oy);
          if (distance < 150) {
            context.globalAlpha = (1 - distance / 150) * 0.6;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(ox, oy);
            context.stroke();
            context.globalAlpha = 1;
          }
        }
      });

      if (frame < Number.MAX_SAFE_INTEGER) {
        animationId = requestAnimationFrame(draw);
      }
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <div className="loginGradient" />
      <div className="loginGlow loginGlowA" />
      <div className="loginGlow loginGlowB" />
      <div className="loginGlow loginGlowC" />
      <canvas ref={canvasRef} className="loginCanvas" />
    </>
  );
}
