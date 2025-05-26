// Шапка

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from 'react-router-dom';

// Контекс
import { useOrderNotifications } from "../contexts/OrderNotificationContext"; // Контекст уведомления о новом заказе

// Импорт компонентов
import api from './../../utils/api'; // API сервера 
import { useAuth } from "../contexts/AuthContext"; // Контекст авторизации
import NavigationConfirmModal from "../modals/NavigationConfirmModal"; // Модальное окно подтверждения ухода со страницы при наличии несохраненных данных

// Импорт стилей
import "./../../styles/blocks/header.css";
import "./../../styles/global/page.css" // Родительский стиль

// Импорт иконок
import userIcon from './../../assets/icons/user.png';
import bellIcon from './../../assets/icons/bell.png';

const Header = () => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const navigate = useNavigate();
    const location = useLocation(); // Получаем текущий маршрут

    const [selectedButton, setSelectedButton] = useState(0); // Выбранная кнопка в шапке
    const [accessRestrictions, setAccessRestrictions] = useState({  // Доступ пользователя к разделам приложения
        isOrderManagementAvailable: true,
        isMessageCenterAvailable: true
    });

    // Данные об авторизованном пользователе
    const [userData, setUserData] = useState({
        name: localStorage.getItem('userName') || '',
        role: localStorage.getItem('userRole') || ''
    });

    const notificationPanelRef = useRef(null); // Ссылка на панель уведомления
    const { allNotifications, togglePanel, isPanelOpen, clearAllNotifications, removeNotification } = useOrderNotifications(); // Состояния из контекста уведомления о новом заказе
    const { updateAuth } = useAuth(); // Состояния из контекста авторизации

    const [showNavigationConfirmModal, setShowNavigationConfirmModal] = useState(false); // Отображение модального окна ухода со страницы
    const [pendingNavigation, setPendingNavigation] = useState(null); // Подтверждение навигации

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Каждые 5 минут или при перезагрузке проверяем данные пользователя. Обновляем данные, проверяем ограничения
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = localStorage.getItem('userId');

                // Если пользователь не авторизован - сбрасываем настройки
                if (!userId) {
                    localStorage.removeItem('accessRestrictions');
                    return;
                }

                // Запрос актуальных данных пользователя
                const response = await api.getAccountById(userId);

                // Обновляем имя в шапке
                if (response?.data?.name) {
                    localStorage.setItem('userName', response.data.name);
                }

                // Проверка блокировки аккаунта
                if (response.data.isAccountTermination) {
                    updateAuth(false);
                    localStorage.removeItem('accessRestrictions');
                    return;
                }

                // Проверка подтверждения email
                if (!response.data.isEmailConfirmed) {
                    updateAuth(false);
                    localStorage.removeItem('accessRestrictions');
                    return;
                }

                // Сохраняем ограничения в localStorage для быстрого доступа
                localStorage.setItem(
                    'accessRestrictions',
                    JSON.stringify({
                        isOrderManagementAvailable: response.data.isOrderManagementAvailable,
                        isMessageCenterAvailable: response.data.isMessageCenterAvailable
                    })
                );

                setAccessRestrictions({
                    isOrderManagementAvailable: response.data.isOrderManagementAvailable,
                    isMessageCenterAvailable: response.data.isMessageCenterAvailable
                }); // Обновляем данные в Header

            } catch (error) {
                console.error('Ошибка при обновлении данных пользователя:', error);
                localStorage.removeItem('accessRestrictions'); // Очистка при ошибке
            }
        };

        // Первый запрос при монтировании
        fetchUserData();

        // Периодическая синхронизация
        const syncInterval = setInterval(fetchUserData, 300000); // 5 минут

        // Очистка при размонтировании компонента
        return () => {
            clearInterval(syncInterval);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps 

    // Автоматически изменяем маршрут при обновлении ограничений роли
    useEffect(() => {
        // Если доступ зблокирован к страницам, то после перезагрузки происходит маршрутизация на специальную страницу
        if (location.pathname.startsWith('/orders') && !accessRestrictions.isOrderManagementAvailable) {
            navigate('/access-denied/orders');
        }
        if (location.pathname.startsWith('/message-center') && !accessRestrictions.isMessageCenterAvailable) {
            navigate('/access-denied/messages');
        }

        // Если доступ разблокирован к страницам, то после перезагрузки происходит маршрутизация на разблокированный контент
        if (location.pathname.startsWith('/access-denied/orders') && accessRestrictions.isOrderManagementAvailable) {
            navigate('/orders');
        }
        if (location.pathname.startsWith('/access-denied/messages') && accessRestrictions.isMessageCenterAvailable) {
            navigate('/message-center');
        }
    }, [accessRestrictions]); // eslint-disable-line react-hooks/exhaustive-deps  

    // Определение активной кнопки при загрузке и изменении маршрута
    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/orders')) setSelectedButton(0);
        else if (path.startsWith('/access-denied/orders')) setSelectedButton(0);
        else if (path.startsWith('/message-center')) setSelectedButton(1);
        else if (path.startsWith('/access-denied/messages')) setSelectedButton(1);
        else if (path.startsWith('/personal-account')) setSelectedButton(null); // Снимаем выделение кнопки
    }, [location.pathname]);

    // Очистка localStorage при размонтировании
    useEffect(() => {
        return () => {
            localStorage.removeItem('selectedButtonHeaderIndex'); // Кнопки в Header
        };
    }, []);

    // Обработчик клика вне панели уведомления
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target) && isPanelOpen) {
                togglePanel(); // Закрываем окно
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [togglePanel]); // eslint-disable-line react-hooks/exhaustive-deps 

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Навигация
    const handleNavigation = (path, index) => {
        const checkNavigation = () => {
            const isOrdersBlocked = path === '/orders' && !accessRestrictions.isOrderManagementAvailable;
            const isMessagesBlocked = path === '/message-center' && !accessRestrictions.isMessageCenterAvailable;

            if (isOrdersBlocked) {
                navigate('/access-denied/orders');
                return;
            }

            if (isMessagesBlocked) {
                navigate('/access-denied/messages');
                return;
            }

            setSelectedButton(index);
            navigate(path);
        };

        // Проверка на несохраненные изменения
        if (sessionStorage.getItem('isDirty') === 'true') { // На false isDirty при выходе без сохранения менять не нужно, так как компонент размонтируется и удалит состоние isDirty в localStorage
            setPendingNavigation(() => checkNavigation);
            setShowNavigationConfirmModal(true);
        } else {
            checkNavigation();
        }
    };

    // Обработчики кликов
    const handleLogoClick = () => handleNavigation('/orders', true);
    const handleUserClick = () => handleNavigation('/personal-account', false);

    // Навигация к выбранному заказу из панели уведомления
    const handleNavigationOrder = (path) => {
        togglePanel();
        navigate(path);
    }

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div>
            <header className="header-container">
                <div
                    className="header-logo"
                    onClick={handleLogoClick}
                >
                    ВкусноРолл.Менеджер
                </div>

                <nav style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '0', padding: '0' }}>
                    {/* Кнопка "Заказы" */}
                    <button
                        className="header-nav-button"
                        onClick={() => handleNavigation('/orders', 0)}
                        style={{
                            backgroundColor: selectedButton === 0 ? 'gray' : 'transparent',
                            color: selectedButton === 0 ? 'white' : 'black'
                        }}
                    >
                        Заказы
                    </button>

                    {/* Кнопка "Центр сообщений" */}
                    <button
                        className="header-nav-button"
                        onClick={() => handleNavigation('/message-center', 1)}
                        style={{
                            backgroundColor: selectedButton === 1 ? 'gray' : 'transparent',
                            color: selectedButton === 1 ? 'white' : 'black',
                            // TODO — центр сообщений скрыт в рамках дипломной работы
                            display: 'none'
                        }}
                    >
                        Центр сообщений
                    </button>
                </nav>

                <div className="header-icons" ref={notificationPanelRef}>
                    <div className="header-user-details">
                        <span className="header-user-name">{userData.name}</span>
                        <span className="header-user-role">{userData.role}</span>
                    </div>

                    {/* Личныйы кабинет */}
                    <img
                        src={userIcon}
                        alt="User"
                        onClick={handleUserClick}
                    />

                    {/* Шторка уведомлений */}
                    <div ref={notificationPanelRef}>
                        <div className="header-notification-bell" onClick={togglePanel}>
                            <img
                                src={bellIcon}
                                alt="User"
                            />
                            {allNotifications.length > 0 && (
                                <span className={`header-notification-badge ${allNotifications.length > 99 ? 'header-notification-badge--large' : ''}`} >
                                    {allNotifications.length}
                                </span>
                            )}
                        </div>

                        {isPanelOpen && (
                            <div className="order-notification-panel">
                                <div className="order-notification-header">
                                    <h3>Уведомления о заказах</h3>
                                    <button
                                        onClick={clearAllNotifications}
                                        className="order-notification-clear-all"
                                    >
                                        Очистить все
                                    </button>
                                </div>

                                <div className="order-notification-list">
                                    {allNotifications.length === 0 ? (
                                        <div className="notification-empty-state">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                            <span>Новых уведомлений нет</span>
                                            <small>Здесь будут появляться новые заказы</small>
                                        </div>
                                    ) :
                                        (allNotifications.map(notification => (
                                            <div key={notification.id} className="order-notification-item">
                                                <div className="order-notification-content"
                                                    // Переход на страницу с заказом
                                                    onClick={() => {
                                                        // Проверка на наличие несохраненных изменений
                                                        if (sessionStorage.getItem('isDirty') === 'true') { // На false isDirty при выходе без сохранения менять не нужно, так как компонент размонтируется и удалит состоние isDirty в localStorage
                                                            setPendingNavigation(() => () => handleNavigationOrder(`/orders/edit/${notification.id}`));
                                                            setShowNavigationConfirmModal(true);
                                                        } else {
                                                            handleNavigationOrder(`/orders/edit/${notification.id}`)
                                                        }
                                                    }}>
                                                    <span>{notification.text}</span>
                                                    <small>{notification.date}</small>
                                                </div>
                                                <button
                                                    onClick={() => removeNotification(notification.id)}
                                                    className="order-notification-close"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))
                                        )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Модальное окно подтверждения ухода со страницы при наличии несохраненных данных */}
            <NavigationConfirmModal
                isOpen={showNavigationConfirmModal}
                onConfirm={() => {
                    pendingNavigation?.();
                    setShowNavigationConfirmModal(false);
                }}
                onCancel={() => setShowNavigationConfirmModal(false)}
            />
        </div>
    );
}

export default Header;