// Шапка

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';

// Импорт компонентов


// Импорт стилей
import "./../../styles/blocks/header.css";

// Импорт иконок
import userIcon from './../../assets/icons/user.png';

const Header = () => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const navigate = useNavigate();
    const location = useLocation(); // Получаем текущий маршрут

    const [selectedButton, setSelectedButton] = useState(0); // Выбранная кнопка в шапке

    // Данные об авторизованном пользователе
    const [userData, setUserData] = useState({
        name: localStorage.getItem('userName') || '',
        role: localStorage.getItem('userRole') || ''
    });

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Инициализация при рендере компонента
    useEffect(() => {
        // Если текущий путь не соответствует ни одному из маршрутов
        if (
            location.pathname !== '/orders' &&
            !location.pathname.startsWith('/message-center') &&
            !location.pathname.startsWith('/personal-account')
        ) {
            navigate('/orders'); // Перенаправляем на маршрут по умолчанию
        }
    }, [navigate, location.pathname]);

    // Определение активной кнопки при загрузке и изменении маршрута
    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/orders')) setSelectedButton(0);
        else if (path.startsWith('/message-center')) setSelectedButton(1);
        else if (path.startsWith('/personal-account')) setSelectedButton(null); // Снимаем выделение кнопки
    }, [location.pathname]);

    // Очистка localStorage при размонтировании
    useEffect(() => {
        return () => {
            localStorage.removeItem('selectedButtonHeaderIndex'); // Кнопки в Header
        };
    }, []);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Навигация
    const handleNavigation = (path, shouldUpdateButton) => {
        const checkNavigation = () => {
            navigate(path);
            if (shouldUpdateButton) {
                const index = ['/orders', '/message-center'].indexOf(path);
                setSelectedButton(index);
                localStorage.setItem('selectedButtonHeaderIndex', index);
            }
            else { //  Если нажата кнопка с маршрутом "/personal-account", сбрасываем выделение кнопки
                setSelectedButton(null);
                localStorage.setItem('selectedButtonHeaderIndex', selectedButton);
            }
        };

        // Проверка на несохраненные изменения
        if (sessionStorage.getItem('isDirty') === 'true') { // На false isDirty при выходе без сохранения менять не нужно, так как компонент размонтируется и удалит состоние isDirty в localStorage
            // setPendingNavigation(() => checkNavigation);
            // setShowNavigationConfirmModal(true);
        } else {
            checkNavigation();
        }
    };

    // Обработчики кликов
    const handleLogoClick = () => handleNavigation('/orders', true);
    const handleUserClick = () => handleNavigation('/personal-account', false);
    const handleMenuButton = (index) =>
        handleNavigation(['/orders', '/message-center'][index], true);

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
                    {['Заказы', 'Центр сообщений'].map((label, index) => (
                        <button
                            className="header-nav-button"
                            key={index}
                            onClick={() => handleMenuButton(index)}
                            style={{
                                backgroundColor: selectedButton === index ? 'gray' : 'transparent',
                                color: selectedButton === index ? 'white' : 'black'
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="header-icons">
                    <div className="header-user-details">
                        <span className="header-user-name">{userData.name}</span>
                        <span className="header-user-role">{userData.role}</span>
                    </div>
                    <img
                        src={userIcon}
                        alt="User"
                        onClick={handleUserClick}
                    />
                </div>
            </header>
        </div>
    );
}

export default Header;