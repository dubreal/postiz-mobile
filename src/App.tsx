import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Spinner } from './components/ui';
import { AppShell } from './components/AppShell';
import { LoginScreen } from './screens/LoginScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { ComposeScreen } from './screens/ComposeScreen';
import { MediaScreen } from './screens/MediaScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-newBgColor">
        <Spinner label="Loading" />
      </div>
    );
  }

  if (status === 'anon') {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<CalendarScreen />} />
        <Route path="compose" element={<ComposeScreen />} />
        <Route path="media" element={<MediaScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
