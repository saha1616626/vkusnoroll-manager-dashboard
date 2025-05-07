// Анимация загрузки данных

import React, { useEffect } from "react";
import PropTypes from 'prop-types';

// Импорт стилей
import "./../../styles/components/loader.css";

import loadingIcon from './../../assets/icons/loading.png'

const Loader = ({ isWorking }) => {

    // Убираем скролл с перекрытого контента
    useEffect(() => {
        document.body.classList.add('no-scroll');
        return () => document.body.classList.remove('no-scroll');
    }, []);

    return (
        <div className={`loader-loading ${isWorking ? 'rotate' : ''}`}>
            <img src={loadingIcon} alt="loadingIcon" className="loader-loadingIcon"/>
        </div>
    );

};

Loader.propTypes = {
    isWorking: PropTypes.func.isRequired, // Обязываем передавать функцию обновления
};

export default Loader;