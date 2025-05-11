// Уведомление о новом заказе

import { useEffect, useState } from 'react';
import { useOrderNotifications } from '../contexts/OrderNotificationContext';
import './../../styles/ui/orderNotificationBanner.css';

const OrderNotificationBanner = () => {
  const { unseenNotifications, markAsShown } = useOrderNotifications(); // Состояния из контекста уведомления о новом заказе
  const [isVisible, setIsVisible] = useState(false); // Отображение уведомления
  const [currentNotification, setCurrentNotification] = useState(null); // Выбранное уведомление для показа
  const [timeoutId, setTimeoutId] = useState(null); // Задержка перед скрытием

  // Установка самого нового уведомления
  useEffect(() => {
    if (unseenNotifications.length > 0) {
      // Сбрасываем предыдущий таймер и скрываем текущее уведомление
      if (timeoutId) clearTimeout(timeoutId);
      setIsVisible(false);

      // После анимации скрытия показываем новое уведомление
      setTimeout(() => {
        const notification = unseenNotifications[0];
        // Помечаем как показанное
        markAsShown(notification.id);

        setCurrentNotification(notification);
        setIsVisible(true);

        // Автоскрытие через 3 секунды
        const newTimeoutId = setTimeout(() => {
          setIsVisible(false);
        }, 3000);

        setTimeoutId(newTimeoutId);
      }, 300); // Время анимации скрытия
    }
  }, [unseenNotifications]); // eslint-disable-line react-hooks/exhaustive-deps 

  // Скрываем уведомление при клике
  const handleClick = () => {
    setIsVisible(false);
    if (timeoutId) clearTimeout(timeoutId);
  };

  // Если нет контента для показа
  if (!currentNotification || !isVisible) return null;

  return (
    // <div className="notification-banner-container">
    //   <div className="notification-banner">
    //     <span>{currentNotification.text}</span>
    //   </div>
    // </div>

    <div
      className={`notification-banner-container ${isVisible ? 'visible' : ''}`}
      onClick={handleClick}
      role="alert"
    >
      <div className="notification-banner">
        <span>{currentNotification.text}</span>
        <small>{currentNotification.date}</small>
      </div>
    </div>
  );
};

export default OrderNotificationBanner;