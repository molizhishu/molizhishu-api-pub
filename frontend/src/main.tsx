import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './ui/AppLayout';
import { RequireAuth } from './ui/RequireAuth';
import { DashboardPage } from './pages/DashboardPage';
import { TaskListPage } from './pages/TaskListPage';
import { NewTaskPage } from './pages/NewTaskPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import './styles.css';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'tasks', element: <TaskListPage /> },
          { path: 'tasks/new', element: <NewTaskPage /> },
          { path: 'tasks/:taskId', element: <TaskDetailPage /> },
          { path: 'settings', element: <SettingsPage /> }
        ]
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
