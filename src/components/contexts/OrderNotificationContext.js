// Контекстный провайдер для управления выводом уведомления о новом заказе

import React, { createContext, useState, useEffect, useContext } from 'react';

const OrderNotificationContext = createContext();

export const OrderNotificationProvider = ({ children }) => {
  const [allNotifications, setAllNotifications] = useState([]); // Все уведомления
  const [unseenNotifications, setUnseenNotifications] = useState([]); // Не показанные
  const [isPanelOpen, setIsPanelOpen] = useState(false); // Шторка уведомлений

  // Загрузка из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orderNotifications');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAllNotifications(parsed);
      setUnseenNotifications(parsed.filter(n => !n.isShown));
    }
  }, []);

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
      isNew: true,
      isShown: false // Уведомление не показано на экране
    };

    setAllNotifications(prev => {
      const updated = [newNotification, ...prev];
      localStorage.setItem('orderNotifications', JSON.stringify(updated));
      return updated;
    });

    setUnseenNotifications(prev => [newNotification, ...prev]);
  };

  // Отметка, что уведомление было показано на экране
  const markAsShown = (id) => {
    setAllNotifications(prev => {
      const updated = prev.map(n =>
        n.id === id ? { ...n, isShown: true } : n
      );
      localStorage.setItem('orderNotifications', JSON.stringify(updated));
      return updated;
    });

    setUnseenNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Удаление уведомления
  const removeNotification = (id) => {
    setAllNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('orderNotifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Очистка всех уведомлений
  const clearAllNotifications = () => {
    setAllNotifications([]);
    setUnseenNotifications([]);
    localStorage.removeItem('orderNotifications');
  };

  // Переключение шторки уведомления
  const togglePanel = () => setIsPanelOpen(!isPanelOpen);

  return (
    <OrderNotificationContext.Provider
      value={{
        allNotifications, // Для панели уведомлений
        unseenNotifications, // Для баннера
        addNotification,
        markAsShown,
        removeNotification,
        clearAllNotifications,
        isPanelOpen,
        togglePanel
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
};

export const useOrderNotifications = () => useContext(OrderNotificationContext);