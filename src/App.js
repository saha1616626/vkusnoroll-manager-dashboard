import { useCallback, useEffect, useState } from 'react';
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
import { OrderNotificationProvider } from './components/contexts/OrderNotificationContext'; // Провайдер уведомления

// Контекс
import { useAuth } from "./components/contexts/AuthContext"; // Контекст авторизации
import { useOrderNotifications } from './components/contexts/OrderNotificationContext'; // Контекст уведомления о новом заказе

// Компоненты
import { isTokenValid } from './utils/auth'; // Проверка токена
import PrivateRoute from './components/pages/protected/PrivateRoute';  // Частный маршрут. Контент доступен после авторизации
import LoginPage from './components/pages/auth/LoginPage'; // Страница авторизации
import HeaderLayout from './components/layouts/HeaderLayout'; // Header и весь дочерний контент
import OrdersPage from './components/pages/OrdersPage'; // Страница для управления заказами пользователей
import MessageCenterPage from './components/pages/MessageCenterPage'; // Страница "Центр сообщений"
import PersonalAccount from './components/pages/PersonalAccount'; // Страница "Личный кабинет"
import api from './utils/api'; // API сервера
import AccessDeniedPage from './components/pages/AccessDeniedPage'; // Страница для редиректа при ошибке доступа
import AddEditOrderPage from './components/pages/AddEditOrderPage'; // Страница для управления заказами

// Импорт стилей
import './styles/global/global.css'; // Глобальные стили

function App() {
  return (
    <Router>
      <AuthProvider> {/* Провайдер авторизации */}
        {/* Провайдер уведомления */}
        <OrderNotificationProvider>
          <AppContent />
        </OrderNotificationProvider>
      </AuthProvider>
    </Router>
  );
};

const AppContent = () => {
  const { isAuthenticated, updateAuth } = useAuth(); // Состояния из контекста авторизации
  const { addNotification } = useOrderNotifications(); // Состояние из контекста уведомления о новом заказе
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

  // Вывод уведомления о новом заказе в реальном времени
  useEffect(() => {
    const token = localStorage.getItem('authManagerToken'); // Получаем токен из хранилища
    if (!token) return;
    const ws = new WebSocket(`ws://localhost:5000/ws?token=${encodeURIComponent(token)}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_ORDER') {
        addNotification(data.orderId, data.orderNumber, data.orderPlacementTime);
      }
    };

    // Очистка
    return () => ws.close();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps 

  return (
    <>
      <Routes>
        {/* Автоматическая навигация в приватный контент в случае успешной авторизации */}
        <Route index element={<Navigate to="/orders" replace />} />

        {/* Cтраница авторизации */}
        <Route path="/login" element={<LoginPage />} />
        {/* Защищённые маршруты (Доступные после авторизации) */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<HeaderLayout />}>

            <Route path="/access-denied/orders" element={
              <AccessDeniedPage message="Доступ к управлению заказами временно ограничен администратором" />
            } />

            <Route path="/access-denied/messages" element={
              <AccessDeniedPage message="Доступ к центру сообщений временно ограничен администратором" />
            } />

            <Route path='/orders' element={
              JSON.parse(localStorage.getItem('accessRestrictions'))?.isOrderManagementAvailable
                ? <OrdersPage />
                : <Navigate to="/access-denied/orders" replace />
            } />
            <Route path='/orders/new' element={
              JSON.parse(localStorage.getItem('accessRestrictions'))?.isOrderManagementAvailable
                ? <AddEditOrderPage mode="add" />
                : <Navigate to="/access-denied/orders" replace />
            } />
            <Route path='/orders/edit/:id' element={
              JSON.parse(localStorage.getItem('accessRestrictions'))?.isOrderManagementAvailable
                ? <AddEditOrderPage mode="edit" />
                : <Navigate to="/access-denied/orders" replace />
            } />

            <Route path='/message-center' element={
              JSON.parse(localStorage.getItem('accessRestrictions'))?.isMessageCenterAvailable
                ? <MessageCenterPage />
                : <Navigate to="/access-denied/messages" replace />
            } />
            
            <Route path='/personal-account' element={<PersonalAccount />} />
          </Route>
        </Route>
      </Routes>
    </>
  );

};

export default App;