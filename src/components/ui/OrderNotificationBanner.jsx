// Уведомление о новом заказе

import { useEffect, useState } from 'react';
import { useOrderNotifications } from '../contexts/OrderNotificationContext';
import './../../styles/ui/orderNotificationBanner.css';

const OrderNotificationBanner = () => {
   const { notifications, currentBannerIndex } = useOrderNotifications(); // Состояния из контекста уведомления о новом заказе

  // Установка самого нового уведомления
  if (notifications.length === 0) return null;
  const currentNotification = notifications[currentBannerIndex];

  return (
    <div className="notification-banner-container">
      <div className="notification-banner">
        <span>{currentNotification.text}</span>
        <small>{currentNotification.date}</small>
      </div>
    </div>
  );
};

export default OrderNotificationBanner;