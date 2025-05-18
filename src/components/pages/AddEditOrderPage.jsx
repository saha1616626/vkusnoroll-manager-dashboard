// Страница для редактирования или добавления нового заказа

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона
import isEqual from 'lodash/isEqual';  // Сравнивает два значения на глубокое равенство

// Импорт компонентов
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования API Яндекс Карт
import api from '../../utils/api';  // API сервера
import OrderCompositionTable from '../ui/OrderCompositionTable'; // Таблица для манипуляций над составом заказов
import OrderAddItemsModal from '../modals/OrderAddItemsModal'; // Модальное окно для добавления товаров в заказ
import AddressOrderModal from '../modals/AddressOrderModal'; // Модальное окно для управления адресом
import DeliveryTimeOrderModal from '../modals/DeliveryTimeOrderModal'; // Модальное окно для управления датой и временем доставки
import ValidationErrorMessageModal from '../modals/ValidationErrorMessageModal'; // Модальное окно отображения ошибок ввода при сохранении данных
import ErrorMessageModal from '../modals/ErrorMessageModal'; // Модальное окно для отображения любых ошибок с кастомным заголовком
import NavigationConfirmModal from "../modals/NavigationConfirmModal"; // Модальное окно подтверждения ухода со страницы при наличии несохраненных данных

// Импорт иконок
import deleteIcon from './../../assets/icons/delete.png'
import moreIcon from './../../assets/icons/moreVertical.png';
import calendarIcon from './../../assets/icons/calendar.png'; // Календарь
import exchangeIcon from './../../assets/icons/exchange.png';

// Импорт стилей
import './../../styles/pages/addEditOrderPage.css'

const AddEditOrderPage = ({ mode }) => {

    /* 
    ===============================
    Состояния, константы и ссылки
    ===============================
    */

    const { id } = useParams(); // Переданный id пользователя в URL запроса
    const pageId = 'add-edit-order-page'; // Уникальный идентификатор страницы
    const navigate = useNavigate();
    const { ymaps } = useYmaps(); // API янедкс карт
    const addressMenuRef = useRef(null); // Ссылка на меню для редактирования и просмотра адреса

    const formTemplate = { // Данные формы
        name: '',
        numberPhone: '',
        paymentMethod: '', // Тип оплаты
        changeAmount: '', // Подготовить сдачу с суммы
        deliveryCost: 0, // Стоимость доставки
        deliveryAddressId: null,
        orderStatusId: 'null',
        isPaymentStatus: false,
        address: { // Адрес
            id: null,
            city: '',
            street: '',
            house: '',
            isPrivateHome: false,
            entrance: '',
            floor: '',
            apartment: '',
            comment: ''
        },
        commentFromClient: '',
        commentFromManager: '',
        deliveryDate: '', // Дата доставки
        deliveryTime: '', // Время доставки
        orderItems: [] // Товары в заказе
    }

    const [isDirty, setIsDirty] = useState(false); // Изменения на странице, требующие сохранения
    const [formData, setFormData] = useState(formTemplate); // Основные данные формы
    const [initialData, setInitialData] = useState(formTemplate); // Исходные данные при загрузке страницы

    const [initialDeliveryDate, setInitialDeliveryDate] = useState(''); // Исходные данные для даты и времени доставки
    const [initialDeliveryTime, setInitialDeliveryTime] = useState('');

    const [deliveryZones, setDeliveryZones] = useState([]); // Зоны доставки
    const [deliveryAddress, setDeliveryAddress] = useState(null); // Адрес доставки
    const [isAddressValid, setIsAddressValid] = useState(true); // Статус валидации адреса доставки
    const [showAddressOrderModal, setShowAddressOrderModal] = useState(false); // Управление отображением модального окна для управления адресом доставки
    const [modeAddressOrderModal, setModeAddressOrderModal] = useState('Add'); // Режим отображения модального окна
    const [showAddModal, setShowAddModal] = useState(false); // Управление отображением модального окна для добавления товара
    const [selectedRows, setSelectedRows] = useState([]); // Выбранные строки в таблице

    const [isDeliveryTimeModalOpen, setIsDeliveryTimeModalOpen] = useState(false); // Модальное окно выбора даты и времени доставки
    const [deliverySchedule, setDeliverySchedule] = useState([]); // График работы доставки на ближайшие 7 дней
    const [currentServerTime, setCurrentServerTime] = useState(null); // Текущее время по МСК
    const [deliveryInterval, setDeliveryInterval] = useState(''); // Интервал для доставки заказа
    const [orderSettings, setOrderSettings] = useState({ // Детали стоимости доставки
        defaultPrice: 0,
        isFreeDelivery: false,
        freeThreshold: 0
    });
    const [orderStatuses, setOrderStatuses] = useState([]); // Статусы заказов
    const [localDeliveryCost, setLocalDeliveryCost] = useState(''); // Стоимость доставки для ручного ввода в поле
    const [isAutomaticModeCalculatingCostDelivery, setIsAutomaticModeCalculatingCostDelivery] = useState(true); // Включен ли режим автоматического расчета стоимости доставки (По умолчанию - Да)
    const [baseDeliveryCost, setBaseDeliveryCost] = useState(''); // Базовая стоимость доставки (из зоны)
    const [freeDeliveryMessage, setFreeDeliveryMessage] = useState(''); // Сообщение о бесплатной доставке или ее условиях
    const [showAddressMenu, setShowAddressMenu] = useState(false); // Меню для редактирования и просмотра адреса
    const [isCashExpanded, setIsCashExpanded] = useState(false); // Экспандер меню для ввода суммы для подготовки сдачи

    // Модальное окно ошибки ввода при сохранении данных
    const [validationErrorMessage, setValidationErrorMessage] = useState([]); // Отображение 
    const [showValidationErrorMessageModal, setShowValidationErrorMessageModal] = useState(false); // Отображение

    // Модальное окно для отображения любых ошибок с кастомным заголовком
    const [errorMessages, setErrorMessages] = useState([]); // Ошибки
    const [showErrorMessageModal, setShowErrorMessageModal] = useState(false); // Отображение 
    const [titleErrorMessageModal, setTitleErrorMessageModal] = useState('Ошибка'); // Заголвок окна

    const [showNavigationConfirmModal, setShowNavigationConfirmModal] = useState(false); // Отображение модального окна ухода со страницы
    const [pendingNavigation, setPendingNavigation] = useState(null); // Подтверждение навигации

    const [refreshKey, setRefreshKey] = useState(0); // Для принудительного обновления данных на странице по таймеру

    /* 
    ==============================
     Настройка страницы, функции
    ==============================
    */

    // Сумма товаров заказа заказа
    const total = formData.orderItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantityOrder || 0), 0);

    /* 
    ===========================
     Управление картой
    ===========================
    */

    // Загрузка зон доставки
    useEffect(() => {
        const loadZones = async () => {
            try {
                const response = await api.getDeliveryZones();
                setDeliveryZones(response.data.zones || []);
            } catch (error) {
                console.error('Ошибка загрузки зон:', error);
            }
        };
        loadZones();
    }, []);

    // Валидация адреса для существующих зон
    useEffect(() => {
        const validateDeliveryAddress = async (coordinates) => {
            if (!ymaps || !deliveryZones || !deliveryAddress || deliveryZones.length === 0) return false;

            const tempMap = new ymaps.Map('hidden-map', { // Создаем скрытую карту
                center: [56.129057, 40.406635],
                zoom: 12.5,
                controls: ['zoomControl']
            });

            try {
                // Получаем и валидируем координаты
                const coordinates = [deliveryAddress.latitude, deliveryAddress.longitude];

                if (!coordinates || coordinates.some(c => isNaN(c)) || coordinates.length !== 2) {
                    setIsAddressValid(false);
                    return;
                }

                // Создаем полигоны и проверяем принадлежность
                let isValid = false;
                let matchedZone = null;

                for (const zone of deliveryZones) {
                    const polygon = new ymaps.Polygon([zone.coordinates]);
                    tempMap.geoObjects.add(polygon);

                    if (polygon.geometry.contains(coordinates)) {
                        isValid = true;
                        matchedZone = zone;
                        break;
                    }
                }

                const baseCost = isValid ?
                    matchedZone?.price ?? orderSettings.defaultPrice :
                    orderSettings.defaultPrice;

                // Обновляем только базовую стоимость
                setBaseDeliveryCost(baseCost);
                setIsAddressValid(isValid);
            } catch (error) {
                console.error('Ошибка валидации:', error);
                setIsAddressValid(false);
                // setDeliveryCost(null);
            } finally {
                // Уничтожаем временную карту
                tempMap.destroy();
            }
        };
        validateDeliveryAddress();
    }, [deliveryAddress]); // eslint-disable-line react-hooks/exhaustive-deps

    // Расчет итоговой стоимости доставки и информирование пользователя сообщением
    const calculateFinalDeliveryCost = async () => {

        // Если адрес доставки не указан
        if (!deliveryAddress) {
            setFormData(prev => ({
                ...prev,
                deliveryCost: 0
            }));
            return;
        }

        if (!orderSettings.freeThreshold && orderSettings.freeThreshold !== 0) return;

        const subtotal = formData.orderItems
            .reduce((sum, item) => sum + item.pricePerUnit * item.quantityOrder, 0);

        // Базовая стоимость берется из отдельного состояния
        const baseCost = isAddressValid ? baseDeliveryCost : orderSettings.defaultPrice;

        let finalCost = baseCost;
        let message = '';

        if (orderSettings.isFreeDelivery) {
            if (subtotal >= orderSettings.freeThreshold) {
                finalCost = 0;
                message = '';
            } else {
                const remaining = orderSettings.freeThreshold - subtotal;
                message = `До бесплатной доставки осталось ${remaining}₽`;
                finalCost = baseCost; // Используем актуальную базовую стоимость
            }
        }

        setFormData(prev => ({
            ...prev,
            deliveryCost: finalCost || 0
        }));
        setFreeDeliveryMessage(message);
    }

    // Обновление итоговой стоимости доставки
    useEffect(() => {
        if (isAutomaticModeCalculatingCostDelivery) { // Авторасчет стоимости доставки только в автоматическом режиме
            calculateFinalDeliveryCost();
        }
        else {
            // В режиме редактирования сохраняем исходное значение из БД
            if (mode === 'edit' && initialData.deliveryCost !== undefined) {
                setFormData(prev => ({
                    ...prev,
                    deliveryCost: initialData.deliveryCost
                }));
            } else {
                // Для нового заказа сбрасываем в 0
                setFormData(prev => ({
                    ...prev,
                    deliveryCost: 0
                }));
            }
        }
    }, [formData.orderItems, baseDeliveryCost, isAutomaticModeCalculatingCostDelivery]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка данных в режиме редактировани
    useEffect(() => {
        if (mode === 'edit' && id) {
            const loadOrderData = async () => {
                try {
                    const response = await api.getOrderById(id);
                    const orderData = response.data;

                    // Преобразование данных адреса
                    const addressData = orderData.deliveryAddress || {};
                    const transformedAddress = {
                        id: addressData.id,
                        city: addressData.city || '',
                        street: addressData.street || '',
                        house: addressData.house || '',
                        apartment: addressData.apartment || '',
                        entrance: addressData.entrance || '',
                        floor: addressData.floor || '',
                        comment: addressData.comment || '',
                        isPrivateHome: addressData.isPrivateHome || false,
                        latitude: addressData.latitude,
                        longitude: addressData.longitude
                    };

                    // Преобразование данных статуса
                    const statusId = orderData.orderStatusId || 'null';

                    // Преобразование состава заказа
                    const transformedItems = orderData.items.map(item => ({
                        dishId: item.dishId,
                        name: item.dishName,
                        pricePerUnit: item.pricePerUnit,
                        quantityOrder: item.quantityOrder,
                        sum: item.pricePerUnit * item.quantityOrder,
                        categoryId: item.dishCategory?.id || '',
                        categoryName: item.dishCategory?.name || ''
                    }));

                    // Форматирование даты и времени
                    let deliveryDate = '';
                    let deliveryTime = '';
                    if (orderData.startDesiredDeliveryTime && orderData.endDesiredDeliveryTime) {
                        const startDate = new Date(orderData.startDesiredDeliveryTime);
                        const endDate = new Date(orderData.endDesiredDeliveryTime);
                        deliveryDate = startDate.toISOString().split('T')[0];
                        deliveryTime = `${formatTime(startDate)} — ${formatTime(endDate)}`;
                    }

                    // Собираем полный объект данных
                    const updatedFormData = {
                        ...formTemplate,
                        name: orderData.nameClient || '',
                        numberPhone: orderData.numberPhoneClient || '',
                        paymentMethod: orderData.paymentMethod,
                        deliveryAddressId: orderData.deliveryAddressId,
                        orderStatusId: statusId,
                        isPaymentStatus: orderData.isPaymentStatus,
                        changeAmount: orderData.prepareChangeMoney || '',
                        deliveryCost: orderData.shippingCost,
                        commentFromManager: orderData.commentFromManager || '',
                        address: transformedAddress,
                        orderItems: transformedItems,
                        deliveryDate,
                        deliveryTime
                    };

                    // Устанавливаем данные формы и начальные данные
                    setFormData(updatedFormData);
                    setInitialData(updatedFormData);

                    setIsAutomaticModeCalculatingCostDelivery(false); // Расчет стоимости доставки в ручном режиме

                    // Если есть значение в поле «Подготовить сдачу с», то открываем меню.
                    if (orderData.paymentMethod === 'Наличные' && orderData.prepareChangeMoney) {
                        setIsCashExpanded(true);
                    }

                    // Сохраняем исходные дату и время
                    setInitialDeliveryDate(deliveryDate);
                    setInitialDeliveryTime(deliveryTime);

                    // Установка адреса доставки
                    setDeliveryAddress({
                        ...transformedAddress,
                        latitude: addressData.latitude,
                        longitude: addressData.longitude
                    });

                } catch (error) {
                    console.error('Ошибка загрузки заказа:', error);
                    setErrorMessages(['Не удалось загрузить данные заказа']);
                    setShowErrorMessageModal(true);
                    navigate('/orders');
                }
            };

            loadOrderData();
        }
    }, [mode, id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Форматирование времени
    const formatTime = (date) => {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // Получаем и устанавливаем расписание работы доставки
    useEffect(() => {
        const loadDeliverySchedule = async () => {
            try {
                const response = await api.getNextSevenDaysSchedule();
                setDeliverySchedule(response.data);

                // Автовыбор первой доступной даты в режиме добавления
                if (mode === 'add') {
                    const firstWorkingDay = response.data.find(d => d.isWorking);
                    if (firstWorkingDay) {
                        setFormData(prev => ({
                            ...prev,
                            deliveryDate: firstWorkingDay.date
                        }));
                        setInitialData(prev => ({
                            ...prev,
                            deliveryDate: firstWorkingDay.date
                        }));
                    }
                }
            } catch (error) {
                console.error('Ошибка загрузки расписания:', error);
                if (window.history.length > 1) { // В случае ошибки происходит маршрутизация на предыдущую страницу или в меню
                    window.history.back();
                } else {
                    window.location.href = '/menu';
                }
            }
        };

        loadDeliverySchedule();
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    // Обновляем важные данные каждые 5 минут по таймеру
    useEffect(() => {
        const loadDeliverySchedule = setInterval(async () => {
            try {
                const responseDeliverySchedule = await api.getNextSevenDaysSchedule();
                setDeliverySchedule(responseDeliverySchedule.data);

                // Автовыбор первой доступной даты в режиме добавления
                if (mode === 'add') {
                    const firstWorkingDay = responseDeliverySchedule.data.find(d => d.isWorking);
                    if (firstWorkingDay) {
                        setFormData(prev => ({
                            ...prev,
                            deliveryTime: ''
                        }));
                    }
                }

                // Если режим редактирования и была выбрана новая дата и время доставки, то происходит сброс времени, так как необходимо актуализировать данные
                if (mode === 'edit' && ((formData.deliveryTime !== initialData.deliveryTime) || (formData.deliveryDate !== initialData.deliveryDate))) {
                    setFormData(prev => ({
                        ...prev,
                        deliveryTime: ''
                    }));
                }

                const responseOrderSettings = await api.getOrderSettings();
                const {
                    defaultPrice,
                    isFreeDelivery,
                    freeThreshold,
                    interval,
                    serverTime // Время в формате ISO
                } = responseOrderSettings.data;

                setOrderSettings({ // Получаем детали стоимости доставки
                    defaultPrice: defaultPrice || 0,
                    isFreeDelivery: Boolean(isFreeDelivery),
                    freeThreshold: Math.max(Number(freeThreshold) || 0, 0)
                });
                setDeliveryInterval(interval); // Интервал доставки
                setCurrentServerTime(new Date(serverTime)); // Устанавливаем текущее время по Москве из БД
            } catch (error) {
                console.error('Ошибка загрузки расписания:', error);
                if (window.history.length > 1) { // В случае ошибки происходит маршрутизация на предыдущую страницу или в меню
                    window.history.back();
                } else {
                    window.location.href = '/menu';
                }
            }
        }, 5 * 60 * 1000); // Обновление данных по окончании заданного времени

        return () => clearInterval(loadDeliverySchedule);
    }, [formData.deliveryDate, initialData.deliveryDate, formData.deliveryTime, initialData.deliveryTime]);  // eslint-disable-line react-hooks/exhaustive-deps

    // Получаем все необходимые данные для формирования заказа
    useEffect(() => {
        const loadOrderSettings = async () => {
            try {
                const response = await api.getOrderSettings();
                const {
                    defaultPrice,
                    isFreeDelivery,
                    freeThreshold,
                    interval,
                    serverTime // Время в формате ISO
                } = response.data;

                setOrderSettings({ // Получаем детали стоимости доставки
                    defaultPrice: defaultPrice || 0,
                    isFreeDelivery: Boolean(isFreeDelivery),
                    freeThreshold: Math.max(Number(freeThreshold) || 0, 0)
                });
                setDeliveryInterval(interval); // Интервал доставки
                setCurrentServerTime(new Date(serverTime)); // Устанавливаем текущее время по Москве из БД
            } catch (error) {
                console.error('Ошибка загрузки настроек заказа:', error);
            }
        };

        loadOrderSettings();
    }, []);

    // Получаем и устанавливаем список статусов заказов
    useEffect(() => {
        const loadDeliverySchedule = async () => {
            try {
                const response = await api.getOrderStatuses();

                // Проверяем наличие данных
                if (!response.data || !Array.isArray(response.data)) { throw new Error('Invalid order statuses data'); }

                // Добавляем системный статус
                const systemStatuses = [
                    { id: 'null', name: 'Новый', sequenceNumber: -1, isAvailableClient: false, isFinalResultPositive: null }
                ];

                const allStatuses = [...systemStatuses, ...response.data]
                    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

                setOrderStatuses(allStatuses);
            } catch (error) {
                console.error('Ошибка загрузки расписания:', error);
                if (window.history.length > 1) { // В случае ошибки происходит маршрутизация на предыдущую страницу или в меню
                    window.history.back();
                } else {
                    window.location.href = '/menu';
                }
            }
        };

        loadDeliverySchedule();
    }, []);

    // Установка статуса заказа по умолчанию ТОЛЬКО В РЕЖИМЕ ДОБАВЛЕНИЯ
    useEffect(() => {
        if (orderStatuses.length > 0 && mode === 'add') {
            const defaultStatus = orderStatuses.find(s => s.name === 'Новый');
            setFormData(prev => ({
                ...prev,
                orderStatusId: defaultStatus?.id || ''
            }));
        }
    }, [orderStatuses]);  // eslint-disable-line react-hooks/exhaustive-deps

    // Эффект для синхронизации стоимости доставки в поле для ручного ввода
    useEffect(() => {
        setLocalDeliveryCost(formData.deliveryCost.toString());
    }, [formData.deliveryCost]);

    // Закрываем меню для редактирования и просмотра адреса
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addressMenuRef.current && !addressMenuRef.current.contains(event.target) && showAddressMenu) {
                setShowAddressMenu(false); // Закрываем меню
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAddressMenu]);

    // Проверка изменений в полях
    useEffect(() => {
        const dirty = !isEqual(formData, initialData);
        setIsDirty(dirty);
    }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

    // Сохраняем состояние о наличии несохраненных данных на странице
    useEffect(() => {
        sessionStorage.setItem('isDirty', isDirty.toString());
    }, [isDirty]);

    // Очистка состояния о наличии несохраненных данных при размонтировании
    useEffect(() => {
        return () => {
            sessionStorage.removeItem('isDirty');
        };
    }, []);

    // Обработка нажатия кнопки "Назад" в браузере
    useEffect(() => {
        const handleBackButton = (e) => {
            if (isDirty) {
                e.preventDefault();
                setPendingNavigation(() => () => { //  Подтверждение перехода
                    goBackOrRedirect(); // Возврат пользователя на страницу назад, если она есть в истории
                });
                setShowNavigationConfirmModal(true); // Показываем модальное окно подтверждения
            }
            else {
                //  Подтверждение перехода
                goBackOrRedirect(); // Возврат пользователя на страницу назад, если она есть в истории
            }
        };

        // Добавляем новую запись в историю вместо замены
        window.history.pushState(null, null, window.location.pathname);
        window.addEventListener("popstate", handleBackButton);

        return () => {
            window.removeEventListener("popstate", handleBackButton);
        };
    }, [navigate, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

    // Блокируем закрытие и обновление страницы, если есть несохраненные данные
    useEffect(() => {
        const handleBeforeUnload = (e) => { // Пользователь пытается покинуть страницу
            if (isDirty) { // Есть несохраненные изменения
                e.preventDefault(); // Предотвращает уход с текущей страницы
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload); // Обработчик handleBeforeUnload добавляется к объекту window всякий раз, когда пользователь пытается покинуть страницу
        return () => window.removeEventListener('beforeunload', handleBeforeUnload); // Функция очистки, которая удаляет обработчик события, когда компонент размонтируется или когда isDirty изменяется
    }, [isDirty]); // Обработчик события будет добавляться каждый раз, когда isDirty изменяется

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Возврат пользователя на страницу назад, если она есть в истории
    const goBackOrRedirect = async () => {
        setIsDirty(false); // Убираем несохраненные изменения
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/orders', { replace: true });
        }
    }

    // Обработчик закрытия страницы
    const handleClosePage = () => { // Функция принимает аргумент forceClose, по умолчанию равный false. Аргумент позволяет при необходимости принудительно закрыть окно или перейти на другую страницу, минуя любые проверки
        if (isDirty) { // Если есть несохраненные изменения
            // Показываем модальное окно
            setPendingNavigation(() => () => {
                goBackOrRedirect(); // Возврат пользователя на страницу назад, если она есть в истории
            });
            setShowNavigationConfirmModal(true);
            return;
        }

        goBackOrRedirect(); // Возврат пользователя на страницу назад, если она есть в истории
    };

    // Обработчик изменений в полях адреса
    const handleAddressChange = (addressData) => {
        setFormData(prev => ({
            ...prev,
            address: {
                city: addressData.city,
                street: addressData.street,
                house: addressData.house,
                isPrivateHome: addressData.isPrivateHome,
                entrance: addressData.entrance || '',
                floor: addressData.floor || '',
                apartment: addressData.apartment || '',
                comment: addressData.comment || '',
                latitude: addressData.latitude,
                longitude: addressData.longitude
            }
        }));

        // Адрес для отображения
        setDeliveryAddress(addressData);
    };

    // Изменение данных в таблице с составом заказа
    const handleOrderItemsChange = (newData) => {
        setFormData(prev => ({ ...prev, orderItems: newData }));
    };

    // Обработчик сохранения данных из модального окна OrderAddItemsModal
    const handleSaveItems = (selectedItems) => {
        setFormData(prev => {
            const updatedItems = [...prev.orderItems];

            selectedItems.forEach(newItem => {
                const existingIndex = updatedItems.findIndex(
                    item => item.dishId === newItem.dishId
                );

                if (existingIndex !== -1) {
                    // Обновляем существующий товар
                    updatedItems[existingIndex] = {
                        ...updatedItems[existingIndex],
                        quantityOrder: newItem.quantity,
                        sum: newItem.quantity * newItem.originalPrice
                    };
                } else {
                    // Добавляем новый товар
                    updatedItems.push({
                        dishId: newItem.dishId,
                        name: newItem.name,
                        categoryId: newItem.categoryId,
                        categoryName: newItem.categoryName,
                        pricePerUnit: newItem.originalPrice,
                        quantityOrder: newItem.quantity,
                        sum: newItem.originalPrice * newItem.quantity
                    });
                }
            });

            // Удаляем товары с нулевым количеством
            return {
                ...prev,
                orderItems: updatedItems.filter(item =>
                    selectedItems.some(si => si.dishId === item.dishId && item.quantityOrder > 0)
                )
            };
        });
        setShowAddModal(false);
    };

    // Выбор строк в таблице
    const handleSelectionChange = (selectedIds) => {
        setSelectedRows(selectedIds);
    };

    // Удаление строк в таблице
    const handleDeleteSelected = () => {
        // Удаление по индексам в обратном порядке
        const newItems = formData.orderItems.filter(
            (_, index) => !selectedRows.includes(index)
        );
        setFormData(prev => ({ ...prev, orderItems: newItems }));
        setSelectedRows([]);
    };

    // Обработчик изменения стоимости доставки при вводе в поле
    const handleDeliveryCostChange = (e) => {
        let value = e.target.value
            .replace(/\D/g, '') // Удаляем все нецифровые символы
            .replace(/^0+/, '0') // Заменяем множественные нули в начале на один
            .replace(/^0([1-9])/, '$1'); // Удаляем ведущий ноль если после него другие цифры

        // Если поле пустое, разрешаем пустую строку
        if (value === '0') value = '';

        setLocalDeliveryCost(value);
    };

    // Обработчик потери фокуса со стоимости доставки
    const handleDeliveryCostBlur = () => {
        const numericValue = parseInt(localDeliveryCost, 10) || 0;
        setFormData(prev => ({ ...prev, deliveryCost: numericValue }));

        // Обновляем локальное значение для отображения форматированного числа
        setLocalDeliveryCost(numericValue.toString());
    };

    // Обработчик для суммы сдачи
    const handleChangeAmountChange = (e) => {
        let value = e.target.value
            .replace(/\D/g, '')
            .replace(/^0+/, '0')
            .replace(/^0([1-9])/, '$1');

        if (value === '0') value = '';

        setFormData(prev => ({
            ...prev,
            changeAmount: value
        }));
    };

    const handleChangeAmountBlur = () => {
        const numericValue = parseInt(formData.changeAmount, 10) || '';
        setFormData(prev => ({
            ...prev,
            changeAmount: numericValue
        }))
    };

    // Валидация полей
    const validateForm = () => {
        const errors = []; // Ошибки заполнения полей

        if (!formData.name.trim()) errors.push('Имя');
        if (formData.numberPhone.replace(/\D/g, '').length !== 11) errors.push('Номер телефона');
        if (!deliveryAddress || !formData.address) errors.push('Адрес доставки');
        if (!formData.deliveryDate || !formData.deliveryTime) errors.push('Дата и время доставки');
        if (!formData.paymentMethod) errors.push('Способ оплаты');

        return errors;
    };

    // Обработчик сохранения
    const handleSave = async () => {

        const errors = validateForm(); // Ошибки заполнения полей и форм

        if (errors.length > 0) {
            setValidationErrorMessage(errors);
            setShowValidationErrorMessageModal(true);
            return;
        }

        // Валидация наличия товаров
        if (!formData.orderItems || formData.orderItems.length < 1) {
            setErrorMessages(['Для сохранения необходимо выбрать минимум один товар']);
            setShowErrorMessageModal(true);
            return;
        }

        // Валидация товаров с нулевым количеством
        const hasZeroQuantity = formData.orderItems.some(item => item.quantityOrder === 0);
        if (hasZeroQuantity) {
            setErrorMessages(['Количество товара не может быть равно нулю']);
            setShowErrorMessageModal(true);
            return;
        }

        // Валидация поля подготовки суммы сдачи
        if (formData.paymentMethod === 'Наличные' && formData.changeAmount && Number(formData.changeAmount) < total) {
            setErrorMessages([`Сумма подготовленной сдачи должна быть не меньше ${(Number(total) + Number(formData.deliveryCost | 0))}₽`]);
            setShowErrorMessageModal(true);
            return;
        }

        // Форматирование времени доставки
        const formatDateTime = (dateString, timeString) => {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const [start, end] = timeString.split(/[—-]/).map(t => t.trim());

            const formatTime = (time) => {
                const [hours, minutes] = time.split(':').map(Number);
                return `${String(hours).padStart(2, '0')}:${String(minutes || '00').padStart(2, '0')}`;
            };

            const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            return {
                start: `${isoDate} ${formatTime(start)}`,
                end: `${isoDate} ${formatTime(end)}`
            };
        };

        const { start, end } = formatDateTime(formData.deliveryDate, formData.deliveryTime);

        // Формируем объект заказа
        const orderData = {
            nameClient: formData.name.trim(),
            numberPhoneClient: formData.numberPhone.replace(/\D/g, ''),
            orderStatusId: formData.orderStatusId,
            address: {
                city: deliveryAddress.city,
                street: deliveryAddress.street,
                house: deliveryAddress.house,
                apartment: deliveryAddress.apartment || null,
                entrance: deliveryAddress.entrance || null,
                floor: deliveryAddress.floor || null,
                comment: deliveryAddress.comment || null,
                isPrivateHome: deliveryAddress.isPrivateHome,
                coordinates: [
                    parseFloat(deliveryAddress.latitude),
                    parseFloat(deliveryAddress.longitude)
                ]
            },
            items: formData.orderItems.map(item => ({
                dishId: item.dishId,
                quantityOrder: item.quantityOrder,
                pricePerUnit: item.pricePerUnit
            })),
            shippingCost: formData.deliveryCost,
            goodsCost: total,
            paymentMethod: formData.paymentMethod,
            isPaymentStatus: formData.isPaymentStatus,
            prepareChangeMoney: formData.paymentMethod === 'Наличные' && formData.changeAmount
                ? Number(formData.changeAmount)
                : null,
            startDesiredDeliveryTime: start,
            endDesiredDeliveryTime: end,
            commentFromManager: formData.commentFromManager || ''
        };

        if (mode === 'add') {
            try {
                const response = await api.createOrder(orderData);
                if (response.data.success) {
                    navigate('/orders');
                }
            } catch (error) {
                console.error('Ошибка создания заказа:', error);
                setErrorMessages([error.response?.data?.error || 'Ошибка создания заказа']);
                setShowErrorMessageModal(true);
            }
        }

        if (mode === 'edit') {
            try {
                const response = await api.updateOrder(id, orderData);
                if (response.data.success) {
                    navigate('/orders');
                }
            } catch (error) {
                console.error('Ошибка обновления заказа:', error);
                setErrorMessages([error.response?.data?.error || 'Ошибка обновления заказа']);
                setShowErrorMessageModal(true);
            }
        }

    }

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="add-edit-order-container">
            {/* Шапка страницы */}
            <div className="add-edit-order-header">
                <h1 className="add-edit-order-title">
                    {mode === 'add' ? 'Новый заказ' : `Заказ VR-${id}`}
                </h1>

                <div className="add-edit-order-header-controls">
                    <button className="button-control add-edit-order-close-btn" onClick={handleClosePage}>Закрыть</button>
                    <button className="button-control add-edit-order-save-btn" onClick={handleSave}>Сохранить</button>
                </div>
            </div>

            {/* Основной контент */}
            <div className="add-edit-order-content">
                {/* Левая колонка */}
                <div className="add-edit-order-main-section">

                    {/* Группа блоков получатель + статусы */}
                    <div className={`add-edit-order-top-group ${formData.commentFromClient ? 'add-edit-order-top-group--order-client-comment' : ''}`}>
                        {/* Блок получателя */}
                        <section className="add-edit-order-section">
                            <h2 className="add-edit-order-subtitle">Данные получателя</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%' }}>
                                <div className="add-edit-order-form-group">
                                    <div className="add-edit-order-input-group">
                                        <label>Имя</label>
                                        <input
                                            type="text"
                                            placeholder=""
                                            maxLength={50}
                                            className={`add-edit-order-input add-edit-order-input-recipients-details`}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="add-edit-order-input-group">
                                        <label>Телефон</label>
                                        <IMaskInput
                                            mask="+7(000)000-00-00"
                                            value={formData.numberPhone}
                                            onAccept={(value) => setFormData({ ...formData, numberPhone: value.replace(/\D/g, '') })}
                                            className={`add-edit-order-input add-edit-order-input-recipients-details`}
                                            placeholder="+7(___) ___-__-__"
                                        />
                                    </div>
                                </div>

                                <div className="add-edit-order-form-group">
                                    <div className="add-edit-order-input-group">
                                        <label>Комментарий клиента</label>
                                        <textarea className="add-edit-order-textarea"
                                            style={{ height: '100%' }}
                                            value={formData?.commentFromClient || '...'} disabled />
                                    </div>
                                </div>
                            </div>

                        </section>

                        {/* Статус и оплата */}
                        <section className="add-edit-order-section">
                            <h2 className="add-edit-order-subtitle">Статусы</h2>
                            <div className="add-edit-order-status-group">
                                <div className="add-edit-order-input-group">
                                    <label>Статус заказа</label>
                                    <div className="add-edit-order-status-select-wrapper">
                                        <select
                                            className="add-edit-order-status-select"
                                            value={formData.orderStatusId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, orderStatusId: e.target.value }))}
                                        >
                                            {orderStatuses.map(status => (
                                                <option key={status.id} value={status.id}>
                                                    {status.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="add-edit-order-input-group">
                                    <label>Статус оплаты</label>
                                    <label className="add-edit-order-payment-status-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPaymentStatus}
                                            onChange={e => setFormData(prev => ({ ...prev, isPaymentStatus: e.target.checked }))}
                                            className="add-edit-order-payment-checkbox"
                                        />
                                        <span className="add-edit-order-payment-status-text"> {formData?.isPaymentStatus ? 'Оплачен' : 'Не оплачен'}</span>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Группа блоков доставка + способ оплаты */}
                    <div className="add-edit-order-top-group">
                        {/* Блок доставки */}
                        <section className="add-edit-order-section">
                            <h2 className="add-edit-order-subtitle">Доставка</h2>

                            <div className="add-edit-order-form-group">
                                {/* Блок адреса */}
                                <div className="add-edit-order-input-group">

                                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                                        <label>Адрес доставки</label>

                                        {!isAddressValid && (
                                            <div className="add-edit-order-address-validation-error">
                                                Адрес вне зоны доставки
                                            </div>
                                        )}
                                    </div>

                                    {deliveryAddress ? (
                                        <div className="add-edit-order-address-card" title={!isAddressValid ? 'Изменилась зона доставки. Пожалуйста, проверьте адрес.' : null}>
                                            <div className={`add-edit-order-address-content ${!isAddressValid ? 'invalid' : ''}`}>
                                                <p className="add-edit-order-address-main">
                                                    {deliveryAddress.city}, {deliveryAddress.street} {deliveryAddress.house}
                                                    {deliveryAddress.isPrivateHome && (
                                                        <span className="add-edit-order-address-private">Частный дом</span>
                                                    )}
                                                </p>
                                                {(deliveryAddress.entrance && deliveryAddress.floor && deliveryAddress.apartment && !deliveryAddress.isPrivateHome) && (
                                                    <div className="add-edit-order-address-details">
                                                        <div>Подъезд: {deliveryAddress.entrance}</div>
                                                        <div>Этаж: {deliveryAddress.floor}</div>
                                                        <div>Квартира: {deliveryAddress.apartment}</div>
                                                    </div>
                                                )}
                                                {(deliveryAddress.comment) && (
                                                    <div className="add-edit-order-address-comment">
                                                        <span className="icon">📝</span>
                                                        {deliveryAddress.comment.slice(0, 150)}{deliveryAddress.comment.length > 150 && '...'}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                className={`add-edit-order-address-more ${deliveryAddress.comment ? 'add-edit-order-address-more--address-comment' : ''}`}
                                                onClick={() => {

                                                }}>
                                                <img src={moreIcon} alt="Изменить" width={16}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Останавливаем распространение события radio
                                                        setShowAddressMenu(true);
                                                    }}
                                                />
                                            </button>

                                            {showAddressMenu && (
                                                <div className="add-edit-order-address-card-menu" ref={addressMenuRef}
                                                    style={{
                                                        top: deliveryAddress.comment ? '35%' :
                                                            !deliveryAddress.comment && !deliveryAddress.isPrivateHome ? '75%' : ''
                                                    }}
                                                >
                                                    <button className="add-edit-order-address-card-menu-item"
                                                        onClick={() => {
                                                            setShowAddressOrderModal(true);
                                                            setModeAddressOrderModal('Edit');
                                                        }}
                                                    >
                                                        Редактировать
                                                    </button>
                                                    <button className="add-edit-order-address-card-menu-item"
                                                        onClick={() => {
                                                            setShowAddressOrderModal(true);
                                                            setModeAddressOrderModal('View');
                                                        }}
                                                    >
                                                        Просмотреть
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                    ) : (
                                        <button
                                            className="add-edit-order-add-address"
                                            onClick={() => {
                                                setShowAddressOrderModal(true);
                                                setModeAddressOrderModal('Add');
                                            }}
                                        >
                                            + Добавить адрес доставки
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: formData.paymentMethod === 'Наличные' ? '1fr 1fr' : '1fr 1fr', gap: '1.5rem' }}>
                                    {/* Блок даты и времени */}
                                    <div className="add-edit-order-input-group">
                                        <label>Дата и время доставки</label>
                                        <div className="add-edit-order-delivery-time-group">
                                            <button
                                                className="add-edit-order-time-select-btn"
                                                onClick={() => setIsDeliveryTimeModalOpen(true)}
                                            >
                                                <img src={calendarIcon} alt="Календарь" width={20} />
                                                {formData.deliveryDate && formData.deliveryTime
                                                    ? `${new Date(formData.deliveryDate).toLocaleDateString('ru-RU')} ${formData.deliveryTime}`
                                                    : "Выбрать дату и время"}
                                            </button>
                                        </div>
                                    </div>


                                    <div className="add-edit-order-input-group">
                                        <label>{`Стоимость доставки ${isAutomaticModeCalculatingCostDelivery ? '(Авторасчет)' : '(Ручной ввод)'}`}</label>
                                        <div className="add-edit-order-delivery-price"
                                            title={!deliveryAddress ? 'Расчет недоступен, укажите адрес' : ''}>
                                            <input
                                                title={deliveryAddress ? isAutomaticModeCalculatingCostDelivery ? 'В данном режиме стоимость доставки рассчитывается автоматически, исходя из различных факторов' : 'В данном режиме стоимость доставки указывается вручную' : 'Расчет недоступен, укажите адрес'}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                className="add-edit-order-input"
                                                value={localDeliveryCost}
                                                onChange={handleDeliveryCostChange}
                                                onBlur={handleDeliveryCostBlur}
                                                disabled={!deliveryAddress || isAutomaticModeCalculatingCostDelivery}
                                            />
                                            <button

                                                className="button-control"
                                                onClick={() => {
                                                    setIsAutomaticModeCalculatingCostDelivery(!isAutomaticModeCalculatingCostDelivery);
                                                }}
                                                style={{ opacity: !deliveryAddress ? '0.5' : '' }}
                                                disabled={!deliveryAddress}
                                            >
                                                Режим
                                                <img src={exchangeIcon} alt="Exchange" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Способ оплаты */}
                        <section className="add-edit-order-section">
                            <h2 className="add-edit-order-subtitle">Способ оплаты</h2>
                            <div className="add-edit-order-payment-methods">
                                {['Наличные', 'Картой', 'Онлайн'].map(method => (
                                    <div key={method}>
                                        <label className="add-edit-order-payment-label">
                                            <div className="add-edit-order-payment-radio-group">
                                                <input
                                                    type="radio"
                                                    name="payment"
                                                    className="add-edit-order-radio"
                                                    checked={formData.paymentMethod === method}
                                                    onChange={() => {
                                                        setFormData(prev => ({ ...prev, paymentMethod: method }));
                                                        if (method !== 'Наличные') setIsCashExpanded(false);
                                                    }}
                                                    onClick={() => { if (method === 'Наличные') setIsCashExpanded(!isCashExpanded) }}
                                                />
                                                <span className="add-edit-order-payment-text">{method}</span>

                                                {method === 'Наличные' && formData.paymentMethod === 'Наличные' && (
                                                    <button
                                                        type="button"
                                                        className="add-edit-order-payment-expander"
                                                        onClick={() => setIsCashExpanded(!isCashExpanded)}
                                                    >
                                                        <svg
                                                            className={`add-edit-order-expander-icon ${isCashExpanded ? 'expanded' : ''}`}
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                        >
                                                            <path d="M6 9l6 6 6-6" />
                                                        </svg>
                                                    </button>
                                                )}

                                            </div>
                                        </label>

                                        {method === 'Наличные' && formData.paymentMethod === 'Наличные' && (
                                            <div className={`add-edit-order-change-container ${isCashExpanded ? 'expanded' : ''}`}>
                                                <div className="add-edit-order-change-field">
                                                    <label className="add-edit-order-field-label">Подготовить сдачу с</label>
                                                    <div className="add-edit-order-currency-input">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            placeholder="5000"
                                                            value={formData.changeAmount}
                                                            onChange={handleChangeAmountChange}
                                                            onBlur={handleChangeAmountBlur}
                                                            min={total}
                                                        />
                                                        <span className="add-edit-order-currency">₽</span>
                                                    </div>
                                                    {formData.changeAmount && formData.changeAmount < total && (
                                                        <p className="add-edit-order-error-message">
                                                            Сумма должна быть не меньше {(Number(total) + Number(formData.deliveryCost || 0))}₽ или оставьте поле пустым
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Товары */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-products-header">
                            <h3 className="add-edit-order-subtitle">Позиции в заказе</h3>
                            <div className="add-edit-order-products-header-button-container">
                                <button
                                    className="button-control"
                                    onClick={handleDeleteSelected}
                                    disabled={selectedRows.length === 0}
                                >
                                    <img src={deleteIcon} alt="Delete" />
                                </button>
                                <button
                                    className="button-control"
                                    onClick={() => setShowAddModal(true)}
                                >
                                    Добавить
                                </button>
                            </div>
                        </div>

                        {/* Таблица */}
                        <div className="add-edit-order-products-table">
                            <OrderCompositionTable
                                data={formData.orderItems}
                                onSelectionChange={handleSelectionChange}
                                selectedRows={selectedRows}
                                onDataChange={handleOrderItemsChange}
                                tableId={pageId}
                            />
                        </div>
                    </section>

                    {/* Комментарий менеджера */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-input-group">
                            <label>Комментарий менеджера</label>
                            <textarea
                                maxLength={1000}
                                style={{ height: '5rem' }}
                                value={formData.commentFromManager}
                                onChange={(e) => setFormData({ ...formData, commentFromManager: e.target.value })}
                                className="add-edit-order-textarea" />
                        </div>
                    </section>
                </div>

                {/* Правая колонка - суммарная информация */}
                <div className="add-edit-order-sidebar">
                    <section className="add-edit-order-summary-section">
                        <h2 className="add-edit-order-subtitle"
                            style={{ display: 'flex', width: '100%', justifyContent: 'center' }}
                        >
                            Итоговая информация</h2>

                        {/* Информирование о достижении суммы для бесплатной доставки возможно только в режиме автоматического расчета стоимости доставки */}
                        {(freeDeliveryMessage && isAutomaticModeCalculatingCostDelivery) && (
                            <div
                                className={`add-edit-order-delivery-message info`}
                            >
                                {freeDeliveryMessage}
                            </div>
                        )}

                        <div className="add-edit-order-summary-row">
                            <span>Сумма товаров:</span>
                            <span>{total} ₽</span>
                        </div>

                        <div className="add-edit-order-summary-row">
                            <span>Доставка:</span>
                            {deliveryAddress ? (
                                <span>{formData.deliveryCost || 0} ₽</span>
                            ) : (
                                <span className="add-edit-order-delivery-error">Укажите адрес</span>
                            )}
                        </div>

                        <div className="add-edit-order-summary-total">
                            <span>Итого:</span>
                            <span>{(Number(total) + Number(formData.deliveryCost || 0))} ₽</span>
                        </div>
                    </section>
                </div>
            </div>

            {/* Мнимая карта для отображения зоны валидации зон доставки */}
            <div id="hidden-map"></div>

            {/* Модальное окно для управления адресом */}
            <AddressOrderModal
                mode={modeAddressOrderModal}
                isOpen={showAddressOrderModal}
                onCancel={() => setShowAddressOrderModal(false)}
                onSave={(addressData) => handleAddressChange(addressData)}
                initialAddress={deliveryAddress}
            />

            {/* Модальное окно выбра даты и интервала доставки в заказе */}
            <DeliveryTimeOrderModal
                isOpen={isDeliveryTimeModalOpen}
                onCancel={() => setIsDeliveryTimeModalOpen(false)}
                deliverySchedule={deliverySchedule}
                currentServerTime={currentServerTime}
                deliveryInterval={deliveryInterval}
                onSelect={(date, time) => {
                    setFormData(prev => ({
                        ...prev,
                        deliveryDate: date,
                        deliveryTime: time
                    }));
                }}
                refreshKey={refreshKey}
                selectedDate={formData.deliveryDate}
                selectedTime={formData.deliveryTime}
                // Добавляем начальные даты в общий список, если их нет (необходимо для добавления неактуальных дней)
                initialDate={initialDeliveryDate}
                initialTime={initialDeliveryTime}
            />

            {/* Модальное окно для добавления товаров в заказ */}
            <OrderAddItemsModal
                isOpen={showAddModal}
                onSave={handleSaveItems}
                existingItems={formData.orderItems}
                onCancel={() => setShowAddModal(false)}
            />

            {/* Модальное окно отображения ошибок ввода при сохранении данных */}
            <ValidationErrorMessageModal
                errors={validationErrorMessage}
                isOpen={showValidationErrorMessageModal}
                onClose={() => setShowValidationErrorMessageModal(false)}
            />

            {/* Модальное окно для отображения любых ошибок с кастомным заголовком */}
            <ErrorMessageModal
                isOpen={showErrorMessageModal}
                title={titleErrorMessageModal || 'Ошибка'}
                errors={errorMessages}
                onClose={() => setShowErrorMessageModal(false)}
            />

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
};

export default AddEditOrderPage;
