// Страница для редактирования или добавления нового заказа

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона

// Импорт компонентов
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования API Яндекс Карт
import api from '../../utils/api';  // API сервера
import OrderCompositionTable from '../ui/OrderCompositionTable'; // Таблица для манипуляций над составом заказов
import OrderAddItemsModal from '../modals/OrderAddItemsModal'; // Модальное окно для добавления товаров в заказ
import AddressOrderModal from '../modals/AddressOrderModal'; // Модальное окно для управления адресом
import DeliveryTimeOrderModal from '../modals/DeliveryTimeOrderModal'; // Модальное окно для управления датой и временем доставки

// Импорт иконок
import deleteIcon from './../../assets/icons/delete.png'
import moreIcon from './../../assets/icons/moreVertical.png';
import calendarIcon from './../../assets/icons/calendar.png'; // Календарь
import autoIcon from './../../assets/icons/auto.png';
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
    const { ymaps, isReady } = useYmaps(); // API янедкс карт
    const mapRef = useRef(null);  // Хранит экземпляр карты и DOM элемент после создания карты
    const addressMenuRef = useRef(null); // Ссылка на меню для редактирования и просмотра адреса

    const [formData, setFormData] = useState({ // Данные формы
        name: '',
        numberPhone: '',
        paymentMethod: '', // Тип оплаты
        changeAmount: '', // Подготовить сдачу с суммы
        deliveryCost: '', // Стоимость доставки
        orderStatusId: '',
        isPaymentStatus: '',
        address: { // Адрес
            city: '',
            street: '',
            house: '',
            isPrivateHome: false,
            entrance: '',
            floor: '',
            apartment: '',
            comment: ''
        },
        comment: ''
    });
    const [orderItems, setOrderItems] = useState([]);  // Товары в заказе

    const [errors, setErrors] = useState({ // Состояние для хранения ошибок заполнения
        name: false,
        numberPhone: false,
        address: false,
        datetime: false,
        payment: false,
        change: false
    });
    const [localNotifications, setLocalNotifications] = useState([]); // Уведомления

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
    const [deliveryDate, setDeliveryDate] = useState(''); // Дата доставки
    const [deliveryTime, setDeliveryTime] = useState(''); // Время доставки
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

    const [refreshKey, setRefreshKey] = useState(0); // Для принудительного обновления данных на странице по таймеру

    /* 
    ==============================
     Настройка страницы, функции
    ==============================
    */

    // Функция для добавления локальных уведомлений
    const addLocalNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setLocalNotifications(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setLocalNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    // Сумма заказа
    const total = orderItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantityOrder || 0), 0);

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
                    // setDeliveryCost(null);
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

        const subtotal = orderItems
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
            // Сброс стоимости доставки для ручного ввода
            setFormData(prev => ({
                ...prev,
                deliveryCost: 0
            }));
        }
    }, [orderItems, baseDeliveryCost, isAutomaticModeCalculatingCostDelivery]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Получаем и устанавливаем расписание работы доставки
    useEffect(() => {
        const loadDeliverySchedule = async () => {
            try {
                const response = await api.getNextSevenDaysSchedule();
                setDeliverySchedule(response.data);

                // Автовыбор первой доступной даты
                const firstWorkingDay = response.data.find(d => d.isWorking);
                if (firstWorkingDay) {
                    setDeliveryDate(firstWorkingDay.date);
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
    }, []);

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

    // Установка статуса заказа по умолчанию
    useEffect(() => {
        if (orderStatuses.length > 0) {
            const defaultStatus = orderStatuses.find(s => s.name === 'Новый');
            setFormData(prev => ({
                ...prev,
                orderStatusId: defaultStatus?.id || ''
            }));
        }
    }, [orderStatuses]);

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

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Обработчик закрытия страницы
    const handleClosePage = () => { // Функция принимает аргумент forceClose, по умолчанию равный false. Аргумент позволяет при необходимости принудительно закрыть окно или перейти на другую страницу, минуя любые проверки
        // if (isDirty) { // Если есть несохраненные изменения
        //     // Показываем модальное окно вместо confirm
        //     setPendingNavigation(() => () => {
        //         navigate('/settings/employees', { replace: true });
        //     });
        //     setShowNavigationConfirmModal(true);
        //     return;
        // }
        navigate('/orders', { replace: true }); // Возврат пользователя на предыдущую страницу с удалением маршрута
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
        setOrderItems(newData);
    };

    // Обработчик сохранения данных из модального окна OrderAddItemsModal
    const handleSaveItems = (selectedItems) => {
        setOrderItems(prev => {
            const updatedItems = [...prev];

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
            return updatedItems.filter(item =>
                selectedItems.some(si =>
                    si.dishId === item.dishId && item.quantityOrder > 0
                )
            );
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
        const newItems = [...orderItems].filter(
            (_, index) => !selectedRows.includes(index)
        );
        setOrderItems(newItems);
        setSelectedRows([]);
    };

    // Обработчик изменения стоимости доставки при вводе в поле
    const handleDeliveryCostChange = (e) => {
        setLocalDeliveryCost(e.target.value);
    };

    // Обработчик потери фокуса
    const handleDeliveryCostBlur = () => {
        const numericValue = Number(localDeliveryCost) || 0;
        setFormData(prev => ({
            ...prev,
            deliveryCost: numericValue
        }));
    };

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
                    <button className="button-control add-edit-order-save-btn">Сохранить</button>
                </div>
            </div>

            {/* Основной контент */}
            <div className="add-edit-order-content">
                {/* Левая колонка */}
                <div className="add-edit-order-main-section">

                    {/* Группа блоков получатель + статусы */}
                    <div className={`add-edit-order-top-group ${formData.comment ? 'add-edit-order-top-group--order-client-comment' : ''}`}>
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
                                            className={`add-edit-order-input add-edit-order-input-recipients-details ${errors.name ? 'input-error' : ''}`}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="add-edit-order-input-group">
                                        <label>Телефон</label>
                                        <IMaskInput
                                            mask="+7(000)000-00-00"
                                            value={formData.numberPhone}
                                            onAccept={(value) => setFormData({ ...formData, numberPhone: value })}
                                            className={`add-edit-order-input add-edit-order-input-recipients-details ${errors.numberPhone ? 'input-error' : ''}`}
                                            placeholder="+7(___) ___-__-__"
                                        />
                                    </div>
                                </div>

                                <div className="add-edit-order-form-group">
                                    <div className="add-edit-order-input-group"
                                    // style={{ // Комментарий отображается, только если он есть и в режиме редактирования.
                                    //     display: mode === 'add' || !formData.comment ? 'none' : ''
                                    // }}
                                    >
                                        <label>Комментарий клиента</label>
                                        <textarea className="add-edit-order-textarea"
                                            style={{ height: '100%' }}
                                            value={formData?.comment || '...'} disabled />
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

                                            {/* TODO - меню улетает */}
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
                                    {!deliveryAddress && errors.address && (
                                        <span className="add-edit-order-error-message">Выберите адрес доставки</span>
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
                                                {deliveryDate && deliveryTime
                                                    ? `${new Date(deliveryDate).toLocaleDateString('ru-RU')} ${deliveryTime}`
                                                    : "Выбрать дату и время"}
                                            </button>
                                        </div>
                                        {errors.datetime && (
                                            <span className="add-edit-order-error-message">Выберите дату и время доставки</span>
                                        )}
                                    </div>


                                    <div className="add-edit-order-input-group">
                                        <label>{`Стоимость доставки ${isAutomaticModeCalculatingCostDelivery ? '(Авторасчет)' : '(Ручной ввод)'}`}</label>
                                        <div className="add-edit-order-delivery-price"
                                            title={!deliveryAddress ? 'Расчет недоступен, укажите адрес' : ''}>
                                            <input
                                                title={deliveryAddress ? isAutomaticModeCalculatingCostDelivery ? 'В данном режиме стоимость доставки рассчитывается автоматически, исходя из различных факторов' : 'В данном режиме стоимость доставки указывается вручную' : 'Расчет недоступен, укажите адрес'}
                                                type="number"
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
                                                    onChange={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                                                />
                                                <span className="add-edit-order-payment-text">{method}</span>
                                            </div>
                                        </label>

                                        {method === 'Наличные' && formData.paymentMethod === 'Наличные' && (
                                            <div className="add-edit-order-change-field">
                                                <label className="add-edit-order-field-label">Подготовить сдачу с</label>
                                                <div className="add-edit-order-currency-input">
                                                    <input
                                                        type="number"
                                                        placeholder="5000"
                                                        value={formData.changeAmount}
                                                        onChange={e => setFormData(prev => ({ ...prev, changeAmount: e.target.value }))}
                                                        min={total}
                                                    />
                                                    <span className="add-edit-order-currency">₽</span>
                                                </div>
                                                {formData.changeAmount && formData.changeAmount < total && (
                                                    <p className="add-edit-order-error-message">
                                                        Сумма должна быть не меньше {total}₽ или оставьте поле пустым
                                                    </p>
                                                )}
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
                                data={orderItems}
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
                    setDeliveryDate(date);
                    setDeliveryTime(time);
                }}
                refreshKey={refreshKey}
            />

            {/* Модальное окно для добавления товаров в заказ */}
            <OrderAddItemsModal
                isOpen={showAddModal}
                onSave={handleSaveItems}
                existingItems={orderItems}
                onCancel={() => setShowAddModal(false)}
            />

        </div>
    );
};

export default AddEditOrderPage;
