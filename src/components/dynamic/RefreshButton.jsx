// Компонент - обновление страницы

import React, { useState } from 'react';
import PropTypes from 'prop-types';

// Импорт стилей
import "./../../styles/components/refreshButton.css"; // Стили на кнопку

// Импорт иконок
import updateIcon from './../../assets/icons/update.png';

const RefreshButton = ({ onRefresh, title }) => {

    // Состяние кнопки обновления данных на странице
    const [isRotating, setIsRotating] = useState(false);

    // Обновление данных на странице
    const handleRefresh = () => {
        // Вращение кнопки после нажатия
        setIsRotating(true);
        if (onRefresh) {
            onRefresh(); // Вызов пропс-функции, которая обновляет данные
        }
        setTimeout(() => {
            setIsRotating(false);
        }, 500); // Сброс состояния через 500 мс
    };

    return (
        // Обновить страницу
        <button className={`refresh-button-reboot ${isRotating ? 'rotate' : ''}`}
            onClick={handleRefresh} title={title || "Обновить страницу"}>
            <img src={updateIcon} alt="Update" className="refresh-button-reboot" />
        </button>
    );

}

RefreshButton.propTypes = {
    onRefresh: PropTypes.func.isRequired, // обязываем передавать функцию обновления
    title: PropTypes.string, // Заголовок для кнопки
};

export default RefreshButton;