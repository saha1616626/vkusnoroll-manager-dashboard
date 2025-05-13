// Страница для редактирования или добавления нового заказа

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона

// Импорт компонентов
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования API Яндекс Карт
import api from '../../utils/api';  // API сервера
import { useDebounce } from '../Hooks/useDebounce'; // Задержка поиска
import OrderCompositionTable from '../ui/OrderCompositionTable'; // Таблица для манипуляций над составом заказов
import OrderAddItemsModal from '../modals/OrderAddItemsModal'; // Модальное окно для добавления товаров в заказ

// Импорт иконок
import deleteIcon from './../../assets/icons/delete.png'

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

    const [formData, setFormData] = useState({ // Данные формы
        name: '',
        numberPhone: '',
        paymentMethod: '', // Тип оплаты
        changeAmount: '', // Подготовить сдачу с суммы
        deliveryCost: '', // Стоимость доставки
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

    const [isAddressValid, setIsAddressValid] = useState(false); // Статус валидации адреса доставки
    const [showAddModal, setShowAddModal] = useState(false); // Управление отображением модального окна для добавления товара

    const [selectedRows, setSelectedRows] = useState([]); // Выбранные строки в таблице

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

    //  Геокодирование адреса (Из координат в текст)
    const reverseGeocode = useCallback(async (coordinates) => {
        try {
            const geocode = await ymaps.geocode(coordinates, {
                kind: 'house',
                results: 1,
                boundedBy: mapRef.current.map.getBounds() // Не сможет определить объект при слишком отдаленном расстоянии от объекта
            });

            const firstGeoObject = geocode.geoObjects.get(0);
            return firstGeoObject?.getAddressLine() || '';
        } catch (error) {
            console.error('Ошибка обратного геокодирования:', error);
            addLocalNotification('Ошибка получения адреса');
            return '';
        }
    }, [ymaps, addLocalNotification]);

    // Сумма заказа
    const total = orderItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantityOrder, 0);

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Эффект для инициализации карты
    useEffect(() => {
        if (!ymaps || !isReady || !document.getElementById('add-edit-order-map')) return; // Если карта не загружена или окно не открыто
        // Устанавливаем карту
        ymaps.ready(() => {
            // Уничтожаем предыдущую карту, если она существует
            if (mapRef.current) mapRef.current.destroy();

            // Создаем новую карту и сохраняем в ref
            const newMap = new ymaps.Map('add-edit-order-map', {
                center: [56.129057, 40.406635],
                zoom: 12.5,
                controls: ['zoomControl']
            });

            // Обработчик клика по карте
            const clickListener = async (e) => {
                try {
                    const coordinates = e.get('coords');
                    const address = await reverseGeocode(coordinates);

                    // Дополнительное геокодирование для получения компонентов
                    const geocode = await ymaps.geocode(address, { results: 1 });
                    const firstGeoObject = geocode.geoObjects.get(0);

                    if (!firstGeoObject) {
                        throw new Error('Адрес не найден');
                    }

                    // Центрируем карту на координатах из БД
                    if (mapRef.current) {
                        mapRef.current.setCenter(coordinates, 17, {
                            duration: 1000,
                            checkZoomRange: true,
                            timingFunction: 'ease-in-out'
                        });
                    }

                    const addressComponents = firstGeoObject.properties.get('metaDataProperty.GeocoderMetaData.Address.Components');

                    const newFormData = {
                        city: addressComponents.find(c => c.kind === 'locality')?.name || '',
                        street: addressComponents.find(c => c.kind === 'street')?.name || addressComponents.find(c => c.kind === 'district')?.name || '',
                        house: addressComponents.find(c => c.kind === 'house')?.name || '',
                        isPrivateHome: false, // Сохраняем текущее значение
                        entrance: formData.entrance,
                        floor: formData.floor,
                        apartment: formData.apartment,
                        comment: formData.comment
                    };

                    // Обновляем состояние
                    setFormData(prev => ({ ...prev, address: newFormData }))

                    // setSearchQuery(address);
                    // setEditedAddress({ displayName: address, coordinates });
                } catch (error) {
                    console.error('Ошибка обработки клика:', error);
                    addLocalNotification('Ошибка определения адреса');
                }
            };

            newMap.events.add('click', clickListener); // Добавляем слушатель

            // Добавляем объекты карты в ref
            mapRef.current = {
                map: newMap,
                geoObjects: newMap.geoObjects,
                events: newMap.events,
                setCenter: newMap.setCenter.bind(newMap),
                destroy: () => {
                    newMap.events.remove('click', clickListener);
                    newMap.destroy();
                }
            };
        });
    }, [ymaps]); // eslint-disable-line react-hooks/exhaustive-deps 

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
    const handleAddressChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value
            }
        }));
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
                    {/* Блок получателя */}
                    <section className="add-edit-order-section">
                        <h2 className="add-edit-order-subtitle">Данные получателя</h2>
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

                            <div className="add-edit-order-input-group">
                                <label>Комментарий клиента</label>
                                <textarea className="add-edit-order-textarea" />
                            </div>
                        </div>
                    </section>

                    {/* Статус и оплата */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-status-group">
                            <div className="add-edit-order-input-group">
                                <label>Статус заказа</label>
                                <select>
                                    <option>Новый</option>
                                    <option>В обработке</option>
                                    <option>Выполнен</option>
                                </select>
                            </div>

                            <div className="add-edit-order-input-group">
                                <label>Оплачен</label>
                                <input type="checkbox" />
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
                                                    onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                                    min={total}
                                                />
                                                <span className="add-edit-order-currency">₽</span>
                                            </div>
                                            {formData.changeAmount && formData.changeAmount < total && (
                                                <p className="add-edit-order-error">
                                                    Сумма должна быть не меньше {total}₽ или оставьте поле пустым
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Комментарий менеджера */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-input-group">
                            <label>Комментарий менеджера</label>
                            <textarea className="add-edit-order-textarea" />
                        </div>
                    </section>

                    {/* Блок доставки */}
                    <section className="add-edit-order-section">
                        <h2 className="add-edit-order-subtitle">Доставка</h2>
                        <div className="add-edit-order-map-container">
                            {/* Левая часть - поля адреса */}
                            <div className="add-edit-order-address-fields">
                                <div className="add-edit-order-input-group">
                                    <label className="add-edit-order-field-label">Город, улица, дом</label>
                                    <input
                                        maxLength="100"
                                        type="text"
                                        // value={searchQuery}
                                        // onChange={(e) => setSearchQuery(e.target.value)}
                                        // onFocus={() => setSuggestionsShow(true)} // При нажатии на поле открываются подсказки поиска
                                        // onBlur={() => setTimeout(() => setSuggestionsShow(false), 200)}
                                        placeholder="Введите адрес..."
                                        className="add-edit-order-input "
                                        style={{ width: 'calc(100% - 33.6px)' }}
                                    />
                                </div>

                                {/* Дополнительные поля адреса */}
                                <div className="add-edit-order-extra-fields">
                                    <div className="add-edit-order-checkbox-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={formData.address.isPrivateHome}
                                                onChange={(e) => {
                                                    e.stopPropagation(); // Предотвращает случайную активацию других обработчиков
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        address: {
                                                            ...prev.address,
                                                            isPrivateHome: e.target.checked,
                                                            entrance: '',
                                                            floor: '',
                                                            apartment: ''
                                                        }
                                                    }));
                                                }}
                                            />
                                            Частный дом
                                        </label>
                                    </div>

                                    {!formData.isPrivateHome && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                                <div className="add-edit-order-input-group">
                                                    <label>Подъезд</label>
                                                    <input
                                                        maxLength="10"
                                                        className="add-edit-order-input"
                                                        placeholder=""
                                                        value={formData.address.entrance}
                                                        onChange={(e) => handleAddressChange('entrance', e.target.value)}
                                                    />
                                                </div>
                                                <div className="add-edit-order-input-group">
                                                    <label>Этаж</label>
                                                    <input
                                                        maxLength="10"
                                                        className="add-edit-order-input"
                                                        placeholder=""
                                                        value={formData.address.floor}
                                                        onChange={(e) => handleAddressChange('floor', e.target.value)}
                                                    />
                                                </div>

                                                <div className="add-edit-order-input-group">
                                                    <label>Квартира</label>
                                                    <input
                                                        maxLength="10"
                                                        className="add-edit-order-input"
                                                        placeholder=""
                                                        value={formData.address.apartment}
                                                        onChange={(e) => handleAddressChange('apartment', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                        </>
                                    )}

                                    <div className="add-edit-order-input-group">
                                        <label>Комментарий</label>
                                        <textarea
                                            placeholder=""
                                            maxLength="300"
                                            value={formData.address.comment}
                                            onChange={(e) => handleAddressChange('comment', e.target.value)}
                                            style={{ padding: '10px' }} />
                                    </div>

                                </div>
                            </div>

                            {/* Правая часть - карта */}
                            <div id="add-edit-order-map" className="add-edit-order-map" />
                        </div>

                        <div className="add-edit-order-delivery-price">
                            <input type="number" placeholder="Стоимость доставки" className="add-edit-order-input" />
                            <button>Рассчитать автоматически</button>
                        </div>
                    </section>

                    {/* Время доставки */}
                    <section className="add-edit-order-section">
                        <button className="add-edit-order-time-btn">
                            Выбрать время доставки
                        </button>
                    </section>

                    {/* Товары */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-products-header">
                            <h3 className="add-edit-order-subtitle">Товары в заказе</h3>
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
                </div>

                {/* Правая колонка - суммарная информация */}
                <div className="add-edit-order-sidebar">
                    <section className="add-edit-order-summary-section">
                        <h2 className="add-edit-order-subtitle">Итоговая информация</h2>

                        <div className="add-edit-order-summary-row">
                            <span>Сумма товаров:</span>
                            <span>{total} ₽</span>
                        </div>

                        <div className="add-edit-order-summary-row">
                            <span>Доставка:</span>
                            <span>{formData.deliveryCost || 0} ₽</span>
                        </div>

                        <div className="add-edit-order-summary-total">
                            <span>Итого:</span>
                            <span>{total + (formData.deliveryCost || 0)} ₽</span>
                        </div>
                    </section>
                </div>
            </div>

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
