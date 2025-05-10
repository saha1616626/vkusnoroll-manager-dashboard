// Контекстный провайдер для управления вывода уведомления о новом заказе

import React, { createContext, useState, useEffect, useContext } from 'react';

const OrderNotificationContext = createContext();

export const OrderNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false); // Шторка уведомлений
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0); // Отображение уведомления о новом заказе

  // Загрузка из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orderNotifications');
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  // Автоматическая ротация баннеров (Отображение уведомления на экране)
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % notifications.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [notifications]);

  // Добавление уведомления
  const addNotification = (orderId, orderNumber, orderPlacementTime) => {

    // Форматирование даты и времени оформления (обрезаем миллисекунды)
    const formatDateTime = (datetime) => {
      if (!datetime) return '—';

      const date = new Date(datetime);

      const datePart = date.toLocaleDateString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const timePart = date.toLocaleTimeString('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `${datePart} ${timePart}`;
    };

    const newNotification = {
      id: orderId,
      text: `Новый заказ ${orderNumber}`,
      date: formatDateTime(orderPlacementTime),
      isNew: true
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      localStorage.setItem('orderNotifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Удаление уведомления
  const removeNotification = (id) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('orderNotifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Очистка всех уведомлений
  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('orderNotifications');
  };

  // Переключение шторки уведомления
  const togglePanel = () => setIsPanelOpen(!isPanelOpen);

  return (
    <OrderNotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
        isPanelOpen,
        togglePanel,
        currentBannerIndex
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
};

export const useOrderNotifications = () => useContext(OrderNotificationContext);