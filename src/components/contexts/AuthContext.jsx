// Контекстный провайдер для управления состоянием авторизации пользователя

import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Компоненты
import { isTokenValid } from './../../utils/auth'; // Проверка токена

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const navigate = useNavigate(); // Навигация

    // Проверяем состояние токена
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const token = localStorage.getItem('authManagerToken'); // Актуальный статус авторизации менеджера
        return isTokenValid(token);
    });

    // Обновление статуса авторизации
    const updateAuth = (status) => {
        setIsAuthenticated(status);
        if (!status) { // Пользователь не авторизован
            // Токен, роль, id и имя удаляются из локального хранилища
            ['authManagerToken', 'userRole', 'userId', 'userName']
                .forEach(key => localStorage.removeItem(key));
            setIsAuthenticated(false);
            navigate('/login');
        }
    };

    // Возвращаем состояние авторизации
    return (
        <AuthContext.Provider value={{ isAuthenticated, updateAuth }}>
            {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => useContext(AuthContext);