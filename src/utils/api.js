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

            // Редирект только если не на целевой странице
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'; // Переход на страницу авторизации
            }
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
    sendCodeManagerRecoveryPassword: (email) =>
        api.post(`/accounts/manager/send-code-recovery`, { email: email.toString() }), // Отправка кода подтверждения для восстановления пароля к учетной записи
    checkingCodeResettingPassword: (id, code) =>
        api.post(`/accounts/user/${id}/verify-code`, { code: code.toString() }), // Проверка кода подтверждения, отправленного на email при восстановлении пароля
    changingPassword: (id, password) =>
        api.put(`/accounts/user/${id}/changing-password`, { password: password }), // Смена пароля

    // Заказы
    getOrders: (params) => api.get('/orders/manager/all', { params }), // Получение всех заказов с пагинацией

    // Статусы заказов
    getOrderStatuses: () => api.get('/orderStatuses'),

    // Список категорий
    getCategories: () => api.get('/categories'),

    // Список блюд
    getUnarchivedDishesNoImageWithActiveCategory: () => api.get('/dishes/available-no-image'), // Получение списка блюд без изображения и те товары, которые не в архиве, и их категория не в архиве

    // Настройки доставки
    getDeliveryZones: () => api.get('/deliverySettings/delivery-zones'), // Зоны доставки
    getOrderSettings: () => api.get('/deliverySettings/order-settings'), // Получаем все необходимые данные для формирования заказа

    // Рабочее время ресторана
    getNextSevenDaysSchedule: () => api.get(`/deliveryWork/next-seven-days`), // Получить график работы на следующие 7 дней

    // Заказы
    createOrder: (data) => api.post('/orders/manager', data), // Создать заказ
    updateOrder: (id, data) => api.put(`/orders/manager/${id}`, data), // Обновить заказ
    getOrderById: (id) => api.get(`/orders/manager/${id}`), // Получить заказ по id
    changeOrderStatuses: (orderIds, newStatusId) => api.put('/orders/manager/change-status', { orderIds, newStatusId }), // Изменить статус заказов
    changeOrderPaymentStatuses: (orderIds, isPaymentStatus) => api.put('/orders/manager/change-payment-statuses', { orderIds, isPaymentStatus }), // Изменить статус оплаты заказов
    deleteOrders: (orderIds) => api.delete('/orders/manager', { data: { orderIds } }), // Удаление заказов

};

// Экспортируем объект по умолчанию
export default apiMethods