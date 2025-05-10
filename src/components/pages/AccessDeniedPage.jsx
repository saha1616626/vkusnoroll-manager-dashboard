// Страница с ошибкой доступа к контенту
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoutesFromChildren } from 'react-router-dom';

// Импорт стилей
import './../../styles/pages/accessDeniedPage.css'

const AccessDeniedPage = ({ message }) => {
    const navigate = useNavigate();

    return (
        <div className="page">
            <div className="access-denied-container">
                <div className="access-denied-content">
                    <h1>Доступ ограничен</h1>
                    <p>{message}</p>
                </div>
            </div>
        </div>
    );
};

export default AccessDeniedPage;