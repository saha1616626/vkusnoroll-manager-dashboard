// Интеграция с серверной частью

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Интерцепторы Axios

// Автоматическая отправка токена авторизации в заголовки каждого исходящего HTTP-запроса
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authManagerToken'); // Извлекается токен аутентификации из локального хранилища браузера
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // Если токен существует, он добавляется в заголовок Authorization с типом Bearer
    }
    return config;
});

// Обработка ответов и автоматическая переаутентификация
api.interceptors.response.use(
    response => response, // Если запрос успешный (т.е. сервер вернул ответ с кодом состояния 2xx), то просто возвращаем ответ
    error => {
        if (error.response?.status === 401) { // Токен недействителен или отсутствует
            // Токен, роль, id и имя удаляется из локального хранилища
            ['authManagerToken', 'userRole', 'userId', 'userName']
                .forEach(key => localStorage.removeItem(key));
            window.location.href = '/login'; // Переход на страницу авторизации
        }
        return Promise.reject(error); // Возвращает ошибку для дальнейшей обработки в компонентах
    }
);

const apiMethods = {

    // Авторизация, выход и восстановлении пароля
    login: (credentials) => api.post('/auth/manager/login', credentials, { withCredentials: true }), // Вход
    logout: () => api.post('/auth/manager/logout', { withCredentials: true }), // Выход

    // Учетные записи
    getAccountById: (id) => api.get(`/accounts/user/${id}`), // Пользователь

    // Заказы
    getOrders: (params) =>
        api.get('/orders/manager/all', {params}), // Получение всех заказов с пагинацией

    // Статусы заказов
    getOrderStatuses: () => api.get('/orderStatuses'),

};

// Экспортируем объект по умолчанию
export default apiMethods