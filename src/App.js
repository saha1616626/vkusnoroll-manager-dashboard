import { useCallback, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate // Используем useNavigate внутри Router
} from 'react-router-dom';

// Провайдеры
import { AuthProvider } from './components/contexts/AuthContext'; // Провайдер авторизации

// Контекс
import { useAuth } from "./components/contexts/AuthContext"; // Контекст авторизации

// Компоненты
import { isTokenValid } from './utils/auth'; // Проверка токена
import PrivateRoute from './components/pages/protected/PrivateRoute';  // Частный маршрут. Контент доступен после авторизации
import LoginPage from './components/pages/auth/LoginPage'; // Страница авторизации
import HeaderLayout from './components/layouts/HeaderLayout'; // Header и весь дочерний контент
import OrdersPage from './components/pages/OrdersPage'; // Страница для управления заказами пользователей
import MessageCenterPage from './components/pages/MessageCenterPage'; // Страница "Центр сообщений"

// Импорт стилей
import './styles/global/global.css'; // Глобальные стили

function App() {
  return (
    <Router>
      <AuthProvider> {/* Провайдер авторизации */}
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

const AppContent = () => {
  const { isAuthenticated, updateAuth } = useAuth(); // Состояния из контекста авторизации
  const navigate = useNavigate();
  const location = useLocation();

  // Проверка токена с защитой от лишних редиректов
  const checkTokenValidity = useCallback(() => {
    const token = localStorage.getItem('authManagerToken');
    const isValid = isTokenValid(token);

    // Если токен невалиден, но в контексте ещё считается авторизованным
    if (!isValid && isAuthenticated) {
      updateAuth(false); // Синхронизируем контекст

      // Редирект только если не на целевой странице
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  }, [navigate, updateAuth, location.pathname, isAuthenticated]);

  // Запуск интервала
  useEffect(() => {
    checkTokenValidity();
    const interval = setInterval(checkTokenValidity, 60000); // Мониторинг состояния токена каждую минуту
    return () => clearInterval(interval);
  }, [checkTokenValidity]);

  return (
    <>
      <Routes>
        {/* Проверка статуса авторизации */}
        {/* <Route path="/" element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <Navigate to="/login" replace />
        } /> */}

        {/* Автоматическая навигация в приватный контент в случае успешной авторизации */}
        <Route index element={<Navigate to="/orders" replace />} />

        {/* Cтраница авторизации */}
        <Route path="/login" element={<LoginPage />} />
        {/* Защищённые маршруты (Доступные после авторизации) */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<HeaderLayout />}>
            <Route path='/orders' element={<OrdersPage />} />
            <Route path='/message-center' element={<MessageCenterPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );

};

export default App;