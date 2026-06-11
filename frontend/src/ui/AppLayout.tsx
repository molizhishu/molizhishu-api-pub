import { Link, Outlet, useLocation } from 'react-router-dom';
import { Bell, ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Plus, RadioTower, Settings } from 'lucide-react';
import { api, clearAuth, getStoredUser, saveStoredUser, type AuthUser } from '../api';
import { useEffect, useState } from 'react';
import logoUrl from '../assets/molizhishu-logo.png';

export function AppLayout() {
  const location = useLocation();
  const activeMenu = getActiveMenu(location.pathname);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('molizhishu_sidebar_expanded');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    let mounted = true;
    api.me()
      .then((currentUser) => {
        if (!mounted) return;
        saveStoredUser(currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        // The shared API client handles invalid tokens globally.
      });
    return () => {
      mounted = false;
    };
  }, []);

  function toggleSidebar() {
    setSidebarExpanded((value) => {
      localStorage.setItem('molizhishu_sidebar_expanded', String(!value));
      return !value;
    });
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // Token may already be invalid; local logout still matters.
    }
    clearAuth();
    window.location.href = '/login';
  }

  return (
    <div className={`shell ${sidebarExpanded ? '' : 'sidebarCollapsed'}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMain">
            <div className="brandLogo" aria-hidden="true">
              <img src={logoUrl} alt="" />
            </div>
            {sidebarExpanded && (
              <div>
                <span>模力指数</span>
                <small>Monitor Console</small>
              </div>
            )}
          </div>
          <button
            className="sidebarToggle"
            type="button"
            onClick={toggleSidebar}
            title={sidebarExpanded ? '折叠菜单' : '展开菜单'}
            aria-label={sidebarExpanded ? '折叠菜单' : '展开菜单'}
          >
            {sidebarExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <nav className="sidebarNav">
          <Link to="/" className={`sidebarNavItem sidebarPrimaryItem ${activeMenu === 'dashboard' ? 'active' : ''}`} title="控制台">
            <LayoutDashboard size={20} />
            {sidebarExpanded && <span>控制台</span>}
          </Link>

          <Link to="/tasks" className={`sidebarNavItem ${activeMenu === 'tasks' ? 'active' : ''}`} title="监控任务">
            <RadioTower size={20} />
            {sidebarExpanded && <span>监控任务</span>}
          </Link>

          <Link to="/tasks/new" className={`sidebarNavItem ${activeMenu === 'new-task' ? 'active' : ''}`} title="新建任务">
            <Plus size={20} />
            {sidebarExpanded && <span>新建任务</span>}
          </Link>

          <Link to="/settings" className={`sidebarNavItem sidebarPrimaryItem ${activeMenu === 'settings' ? 'active' : ''}`} title="系统设置">
            <Settings size={20} />
            {sidebarExpanded && <span>系统设置</span>}
          </Link>
        </nav>

        <div className="sidebarFooter">
          <button className="noticeButton" type="button" title="通知">
            <Bell size={22} />
            {sidebarExpanded && <span>通知</span>}
          </button>
          <div className="sidebarUser">
            <div className="sidebarAvatar">{(user?.displayName || user?.username || '管').slice(0, 1)}</div>
            {sidebarExpanded && (
              <div>
                <strong>{user?.displayName || '管理员'}</strong>
                <span>{user?.username || 'admin'}</span>
              </div>
            )}
            <button type="button" onClick={logout} title="退出登录" aria-label="退出登录">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function getActiveMenu(pathname: string) {
  if (pathname === '/') return 'dashboard';
  if (pathname === '/tasks/new') return 'new-task';
  if (pathname === '/tasks' || /^\/tasks\/[a-f0-9]{32}$/i.test(pathname)) return 'tasks';
  if (pathname === '/settings') return 'settings';
  return '';
}
