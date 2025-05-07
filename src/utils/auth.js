// Проверка срока действия токена авторизации при каждом запросе

import { jwtDecode } from 'jwt-decode'; // Декодирование токена

export const isTokenValid = (token) => {
    if (!token) return false;
    try {
        const { exp } = jwtDecode(token); // Получаем содержимое токена
        return exp * 1000 > Date.now(); // Если токен истек, выходим
    } catch {
        return false;
    }
};