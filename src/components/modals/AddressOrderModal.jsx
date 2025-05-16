// Модальное окно для управления адресом в заказе

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';

// Импорт компонентов
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования API Яндекс Карт
import api from '../../utils/api';  // API сервера
import { useDebounce } from '../Hooks/useDebounce'; // Задержка поиска

// Импорт стилей
import './../../styles/modals/addressOrderModal.css'

// Импорт иконок
import crossIcon from './../../assets/icons/cross.png'; // Крестик
import warningIcon from './../../assets/icons/warning.png';

const AddressOrderModal = ({
    mode,
    isOpen,
    onCancel,
    onSave,
    initialAddress
}) => {

    /* 
    ================================
     Состояния, константы и ссылки
    ================================
    */

    const modalRef = useRef(null); // Ссылка на модальное окно "Адреса доставки"
    const { ymaps, isReady } = useYmaps(); // API янедкс карт

    const [searchQuery, setSearchQuery] = useState(''); // Запрос для поиска адреса
    const [suggestionsShow, setSuggestionsShow] = useState(false); // Отображение подсказки при вводе адреса
    const [suggestions, setSuggestions] = useState([]); // Выбор адреса в списке подсказки
    const dataTemplate = {
        city: '',
        street: '',
        house: '',
        isPrivateHome: false,
        entrance: '',
        floor: '',
        apartment: '',
        comment: ''
    }; // Шаблон адреса
    const [formData, setFormData] = useState(dataTemplate); // Поля формы
    const [isSaving, setIsSaving] = useState(false); // Статус сохранения адреса
    const [isZonesLoading, setIsZonesLoading] = useState(true); // Состояние загрузки зон доставки
    const [deliveryZones, setDeliveryZones] = useState([]); // Зоны доставки из БД
    const [localNotifications, setLocalNotifications] = useState([]); // Отображение уведомлений внутри модального окна
    const mapRef = useRef(null);  // Экземпляр карты и DOM элемент после создания карты
    const [editedAddress, setEditedAddress] = useState(null); // Редактируемый адрес
    const debouncedSearchQuery = useDebounce(searchQuery, 500); // Задержка перед поиском адреса в карте
    const [zoneError, setZoneError] = useState(null); // Сообщение, если адрес выходит за зону доставки

    // Стиль полигона
    const POLYGON_STYLE = useMemo(() => ({
        fillColor: '#0066ff22',
        fillOpacity: 0.4,       // Прозрачность заливки
        strokeColor: '#20b92d',
        strokeWidth: 1,
        interactivityModel: 'default#transparent'
    }), []);

    /* 
    ===========================
     Управление модальным окном
    ===========================
    */

    // Убираем скролл с перекрытой страницы
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('no-scroll');
            return () => document.body.classList.remove('no-scroll');
        }
    }, [isOpen]);

    // Закрываем модальное окно при клике на фон
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isOpen &&
                modalRef.current &&
                !modalRef.current.contains(event.target)
            ) {
                onCancel(); // Закрываем меню
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps 

    // Функция для добавления локальных уведомлений
    const addLocalNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setLocalNotifications(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setLocalNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    // Сброс адреса при закрытии окна
    useEffect(() => {
        if (!isOpen) {
            setEditedAddress(dataTemplate);
            setFormData(dataTemplate);
            setSearchQuery(''); // Поиск
            setSuggestions([]); // Очищаем список адресов в подсказе поиска
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 
    ===========================
     Управление картой
    ===========================
    */

    // Инициализации данных при запуске модального окна в режиме редактирования.
    useEffect(() => {
        if (isOpen && mode === 'Edit' && initialAddress) {

            const coords = [initialAddress.latitude, initialAddress.longitude];

            setFormData({
                city: initialAddress.city,
                street: initialAddress.street,
                house: initialAddress.house,
                isPrivateHome: initialAddress.isPrivateHome,
                entrance: initialAddress.entrance || '',
                floor: initialAddress.floor || '',
                apartment: initialAddress.apartment || '',
                comment: initialAddress.comment || ''
            });

            // Получаем адрес по координатам
            reverseGeocode(coords).then(address => {
                setSearchQuery(address);
                setEditedAddress({
                    displayName: address,
                    coordinates: coords
                });

                // Удаляем предыдущую метку
                if (mapRef.current) {
                    mapRef.current.placemarks.removeAll();
                }

                // Создаем новую метку
                const placemark = new ymaps.Placemark(
                    coords,
                    { balloonContent: address },
                    { preset: 'islands#redIcon' }
                );

                // Добавляем метку на карту
                mapRef.current.placemarks.add(placemark);

                // Центрируем карту на координатах из БД
                if (mapRef.current) {
                    mapRef.current.setCenter(coords, 17, {
                        duration: 1000,
                        checkZoomRange: true,
                        timingFunction: 'ease-in-out'
                    });
                }
            });
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Загрузка зон доставки
    const fetchDeliveryZones = async () => {
        try {
            const zonesRes = await api.getDeliveryZones();
            setDeliveryZones(zonesRes.data.zones || []);
            setIsZonesLoading(false);
        } catch (error) {
            console.error('Ошибка загрузки зон:', error);
            addLocalNotification('Ошибка загрузки зон доставки');
            setIsZonesLoading(false);
        }
    };

    // Загружаем зоны доставки только при открытом модальном окне и готовом API
    useEffect(() => {
        if (isReady) {
            fetchDeliveryZones();
        }
    }, [isOpen, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

    // Валидация адреса для существующих зон
    const validateDeliveryAddress = async (coordinates) => {
        if (!ymaps || deliveryZones.length === 0) return false;

        try {
            // Создаем временный массив для хранения созданных полигонов
            const tempPolygons = [];

            const isValid = deliveryZones.some(zone => {
                if (!Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
                    console.error('Некорректные координаты зоны:', zone);
                    return false;
                }

                // Создаем полигон
                const polygon = new ymaps.Polygon([zone.coordinates], {}, {
                    fillOpacity: 0.001,
                    strokeWidth: 0
                });

                if (!polygon.geometry) {
                    console.error('Невозможно создать геометрию полигона');
                    return false;
                }

                // Добавляем полигон во временный массив и на карту
                tempPolygons.push(polygon);
                tempPolygons.forEach(polygon => {
                    mapRef.current.polygons.add(polygon); // Временные полигоны в отдельную коллекцию
                });

                // Проверка принадлежности точки
                return polygon.geometry.contains(coordinates);
            });

            // Удаляем все временные полигоны после проверки
            tempPolygons.forEach(polygon => {
                mapRef.current.polygons.remove(polygon);
            });

            return isValid;

        } catch (e) {
            console.error('Ошибка проверки зоны:', e);
            return false;
        }
    };

    //  Геокодирование адреса (Из координат в текст)
    const reverseGeocode = async (coordinates) => {
        try {
            if (!ymaps) return;
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
    }

    // Эффект для инициализации карты (без полигонов)
    useEffect(() => {
        if (!ymaps || !isReady || !isOpen || !document.getElementById('address-order-modal-map')) return; // Если карта не загружена или окно не открыто

        // Устанавливаем карту
        ymaps.ready(() => {
            // Уничтожаем предыдущую карту, если она существует
            if (mapRef.current) mapRef.current.destroy();

            // Создаем новую карту и сохраняем в ref
            const newMap = new ymaps.Map('address-order-modal-map', {
                center: mode === 'View' && initialAddress
                    ? [initialAddress.latitude, initialAddress.longitude]
                    : [56.129057, 40.406635],
                zoom: mode === 'View' ? 17 : 12.5,
                controls: ['zoomControl']
            });

            // Для режима просмотра добавляем только метку
            if (mode === 'View' && initialAddress) {
                const placemark = new ymaps.Placemark(
                    [initialAddress.latitude, initialAddress.longitude],
                    { balloonContent: `${initialAddress.city}, ${initialAddress.street} ${initialAddress.house}` },
                    { preset: 'islands#redIcon' }
                );
                newMap.geoObjects.add(placemark);
            }

            // Отдельные коллекции для полигонов и меток
            const polygonsCollection = new ymaps.GeoObjectCollection();
            const placemarksCollection = new ymaps.GeoObjectCollection();

            // Добавляем коллекции на карту
            newMap.geoObjects.add(polygonsCollection);
            newMap.geoObjects.add(placemarksCollection);

            // Обработчик клика по карте
            const clickListener = async (e) => {
                try {
                    if (mode !== 'Add' && mode !== 'Edit') return;  // Можно поставить маркер только в определенном режиме

                    const coordinates = e.get('coords');
                    const address = await reverseGeocode(coordinates);

                    // Дополнительное геокодирование для получения компонентов
                    const geocode = await ymaps.geocode(address, { results: 1 });
                    const firstGeoObject = geocode.geoObjects.get(0);

                    if (!firstGeoObject) {
                        throw new Error('Адрес не найден');
                    }

                    // Валидация выбранного адреса
                    const isValidZone = await validateDeliveryAddress(coordinates);
                    if (!isValidZone) {
                        setZoneError('Внимание, адрес вне зоны доставки');
                    } else {
                        setZoneError(null);
                    }

                    // Удаляем предыдущую метку
                    if (mapRef.current) {
                        mapRef.current.placemarks.removeAll();
                    }

                    // Создаем новую метку
                    const placemark = new ymaps.Placemark(
                        coordinates,
                        { balloonContent: address },
                        { preset: 'islands#redIcon' }
                    );

                    // Добавляем метку на карту
                    mapRef.current.placemarks.add(placemark);

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
                        isPrivateHome: false,
                        // Сброс дополнительных полей
                        entrance: '',
                        floor: '',
                        apartment: '',
                        comment: ''
                    };

                    // Обновляем состояние
                    setFormData(newFormData);
                    setSearchQuery(address);
                    setEditedAddress({ displayName: address, coordinates });
                } catch (error) {
                    console.error('Ошибка обработки клика:', error);
                    addLocalNotification('Ошибка определения адреса');
                }
            }

            newMap.events.add('click', clickListener); // Добавляем слушатель

            // Добавляем объекты карты в ref
            mapRef.current = {
                map: newMap,
                polygons: polygonsCollection,
                placemarks: placemarksCollection,
                geoObjects: newMap.geoObjects,
                setCenter: newMap.setCenter.bind(newMap),
                destroy: () => {
                    newMap.events.remove('click', clickListener);
                    newMap.destroy();
                }
            };
        });
    }, [isOpen, isReady, ymaps]); // eslint-disable-line react-hooks/exhaustive-deps

    // Эффект для отрисовки/обновления полигонов при изменении deliveryZones
    useEffect(() => {
        if (!ymaps || !mapRef.current) return;

        // Ожидаем полной инициализации API Яндекс.Карт
        ymaps.ready(() => {
            // Удаляем ВСЕ полигоны из отдельной коллекции
            mapRef.current.polygons.removeAll();

            // Добавляем новые полигоны
            deliveryZones.forEach(zone => {
                try {
                    if (!Array.isArray(zone.coordinates)) {
                        console.error('Некорректные координаты для зоны:', zone);
                        return;
                    }

                    const polygon = new ymaps.Polygon([zone.coordinates],
                        { hintContent: 'Зона доставки' },
                        {
                            ...POLYGON_STYLE
                        });
                    mapRef.current.polygons.add(polygon);
                } catch (e) {
                    console.error('Ошибка создания полигона:', e);
                }
            });
        });
    }, [deliveryZones]); // eslint-disable-line react-hooks/exhaustive-deps


    // Эффект для обработки поиска с debounce (Задержка)
    useEffect(() => {
        if (debouncedSearchQuery) {
            handleAddressSearch(debouncedSearchQuery);
        }
    }, [debouncedSearchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

    // Обработчик поиска адреса
    const handleAddressSearch = async (query) => {
        try {
            await ymaps.ready();
            const res = await ymaps.geocode(query, {
                boundedBy: mapRef.current?.map.getBounds(),
                results: 5 // Ограничение количества результатов 
            });

            // Обработка ответа
            const suggestions = res.geoObjects.toArray().map(item => ({
                displayName: item.getAddressLine(),
                coordinates: item.geometry.getCoordinates()
            }));

            setSuggestions(suggestions);
        } catch (error) {
            console.error('Ошибка геокодера:', error);
        }
    };

    // Обработчик выбора адреса в подсказе поиске
    const handleSelectSuggestion = async (suggestion) => {
        setSearchQuery(suggestion.displayName);
        setSuggestions([]); // Очищаем список адресов в подсказе поиска

        // Валидация выбранного адреса
        const isValidZone = await validateDeliveryAddress(suggestion.coordinates);
        if (!isValidZone) {
            setZoneError('Внимание, адрес вне зоны доставки');
        } else {
            setZoneError(null);
        }

        // Сохраняем полученные координаты
        setEditedAddress({
            displayName: suggestion.displayName,
            coordinates: suggestion.coordinates
        });

        // Обновляем координаты на карте (ТОЛЬКО МЕТКИ). Полигоны без не трогаем
        if (mapRef.current) {
            mapRef.current.setCenter(suggestion.coordinates, 17, {
                duration: 1000, // Продолжительность анимации в миллисекундах
                checkZoomRange: true,
                timingFunction: 'ease-in-out'
            });

            // Удаляем старые метки
            mapRef.current.placemarks.removeAll();

            // Добавляем новую метку с контентом
            const placemark = new ymaps.Placemark(
                suggestion.coordinates,
                { balloonContent: suggestion.displayName }, // Балун с адресом
                { preset: 'islands#redIcon' } // Стиль иконки
            );
            mapRef.current.placemarks.add(placemark);
        }

        try {
            // Парсим адресные компоненты
            await ymaps.ready();
            const geocode = await ymaps.geocode(suggestion.displayName, { results: 1 }); // Ограничение количества результатов геокодирования
            const firstGeoObject = geocode.geoObjects.get(0);

            // Проверка наличия результатов
            if (!firstGeoObject) {
                throw new Error('Адрес не найден');
            }

            const addressComponents = firstGeoObject.properties.get('metaDataProperty.GeocoderMetaData.Address.Components');

            const newFormData = {
                city: addressComponents.find(c => c.kind === 'locality')?.name || '',
                street: addressComponents.find(c => c.kind === 'street')?.name || addressComponents.find(c => c.kind === 'district')?.name || '',
                house: addressComponents.find(c => c.kind === 'house')?.name || '',
                isPrivateHome: false,
                // Сброс дополнительных полей
                entrance: '',
                floor: '',
                apartment: '',
                comment: ''
            };
            setFormData(newFormData);
        } catch (error) {
            console.error('Ошибка геокодирования:', error);
            addLocalNotification('Не удалось определить детали адреса');
        }
    };

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Обработчик изменений в полях формы
    const handleExtraFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Сохранение адреса
    const handleSaveAddress = async () => {
        if (!editedAddress?.coordinates) {
            addLocalNotification('Выберите адрес на карте или введите запрос');
            return;
        }

        // Проверка обязательных полей: город, улица, дом
        if (!formData.city?.trim() || !formData.street?.trim() || !formData.house?.trim()) {
            addLocalNotification('Заполните город, улицу и дом');
            return;
        }

        // Если isPrivateHome === false, проверяем дополнительные поля
        if (!formData.isPrivateHome) {
            const requiredFields = ['entrance', 'floor', 'apartment'];
            const missingFields = requiredFields.filter(field => !formData[field]?.trim());
            if (missingFields.length > 0) {
                addLocalNotification('Заполните подъезд, этаж и квартиру');
                return;
            }
        }

        try {
            const [latitude, longitude] = editedAddress.coordinates; // Устанавливаем координаты

            // Подготовка данных для отправки
            const dataToSend = {
                accountId: null,
                city: formData.city.trim(),
                street: formData.street.trim(),
                house: formData.house.trim(),
                isPrivateHome: formData.isPrivateHome,
                entrance: formData.entrance?.trim() || null,
                floor: formData.floor?.trim() || null,
                apartment: formData.apartment?.trim() || null,
                comment: formData.comment?.trim() || null,
                latitude,
                longitude
            };

            // Передаем сохраняемый адрес в родителя
            if (onSave) {
                onSave(dataToSend);
            }
            onCancel(); // Закрываем модальное окно
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            addLocalNotification(error.response.data.error || 'Не удалось сохранить адрес');
        } finally {
            setIsSaving(false);
        }
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="address-order-modal-overlay">
            {/* Закрыть форму */}
            <button
                onClick={() => onCancel()}
                className="address-order-modal-close-button"
                aria-label="Закрыть форму"
            >
                <img src={crossIcon} alt="Cross" />
            </button>
            {/* Основной контент */}
            <div className={`address-order-modal-container ${isOpen ? 'active' : ''}`} ref={modalRef}>
                {/* Режим добавления или изменения адреса */}
                {(mode === 'Add' || mode === 'Edit') &&
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                        {/* Поля */}
                        <div className="address-order-modal-sidebar">
                            <div className="address-order-modal-form">
                                <div>
                                    <div className="address-order-modal-form-title">Адрес доставки</div>

                                    <div className="address-order-modal-form-input-group">
                                        <label>Город, улица, дом</label>
                                        <input
                                            maxLength="100"
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setSuggestionsShow(true)} // При нажатии на поле открываются подсказки поиска
                                            onBlur={() => setTimeout(() => setSuggestionsShow(false), 200)}
                                            placeholder="Введите адрес..."
                                            className="address-order-modal-form-input"
                                            style={{ width: 'calc(100% - 33.6px)' }}
                                        />
                                    </div>

                                    {suggestionsShow && suggestions.length > 0 && (
                                        <div className="address-order-modal-form-suggestions-list">
                                            {suggestions.map((suggestion, index) => (
                                                <div
                                                    key={index}
                                                    className="address-order-modal-form-suggestion-item"
                                                    onClick={() => handleSelectSuggestion(suggestion)}
                                                >
                                                    {suggestion.displayName}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Дополнительные поля адреса */}
                                    <div className="address-order-modal-form-extra-fields">
                                        <div className="address-order-modal-form-checkbox-group">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isPrivateHome}
                                                    onChange={(e) => {
                                                        e.stopPropagation(); // Предотвращает случайную активацию других обработчиков
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            isPrivateHome: e.target.checked,
                                                            entrance: '',
                                                            floor: '',
                                                            apartment: ''
                                                        }))
                                                    }}
                                                />
                                                Частный дом
                                            </label>
                                        </div>

                                        {!formData.isPrivateHome && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                                    <div className="address-order-modal-form-input-group">
                                                        <label>Подъезд</label>
                                                        <input
                                                            maxLength="10"
                                                            className="address-order-modal-form-input"
                                                            placeholder=""
                                                            value={formData.entrance}
                                                            onChange={(e) => handleExtraFieldChange('entrance', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="address-order-modal-form-input-group">
                                                        <label>Этаж</label>
                                                        <input
                                                            maxLength="10"
                                                            className="address-order-modal-form-input"
                                                            placeholder=""
                                                            value={formData.floor}
                                                            onChange={(e) => handleExtraFieldChange('floor', e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="address-order-modal-form-input-group">
                                                        <label>Квартира</label>
                                                        <input
                                                            maxLength="10"
                                                            className="address-order-modal-form-input"
                                                            placeholder=""
                                                            value={formData.apartment}
                                                            onChange={(e) => handleExtraFieldChange('apartment', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="address-order-modal-form-input-group">
                                            <label>Комментарий</label>
                                            <textarea
                                                placeholder=""
                                                maxLength="300"
                                                value={formData.comment}
                                                onChange={(e) => handleExtraFieldChange('comment', e.target.value)}
                                                style={{ padding: '10px' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="address-order-modal-form-btn-group">
                                    <button
                                        className="address-order-modal-form-back-btn"
                                        onClick={() => onCancel()}
                                    >
                                        Назад
                                    </button>
                                    <button
                                        className="address-order-modal-form-save-btn"
                                        onClick={handleSaveAddress}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Карта */}
                        <div id="address-order-modal-map" className="address-order-modal-map-v1" />

                        {/* Ошибка валидации адреса */}
                        {zoneError && (
                            <div className="address-order-modal-zone-error"
                                onClick={() => setZoneError(null)}>
                                <img src={warningIcon} className="address-order-modal-zone-error-icon" alt="Warning" />
                                {zoneError}
                            </div>
                        )}
                    </div>
                }

                {/* Режим просмотра адреса */}
                {mode === 'View' &&
                    <div className="address-order-modal-view-container">
                        {/* <div> */}
                            <div className="address-order-modal-view-info">
                                <h3 className="address-order-modal-view-title">Адрес доставки</h3>
                                <div className="address-order-modal-view-content">
                                    <p className="address-order-modal-view-main">
                                        {initialAddress.city}, {initialAddress.street} {initialAddress.house}
                                        {initialAddress.isPrivateHome && (
                                            <span className="address-order-modal-view-private">Частный дом</span>
                                        )}
                                    </p>
                                    {!initialAddress.isPrivateHome && (
                                        <div className="address-order-modal-view-details">
                                            {initialAddress.entrance && <div>Подъезд: {initialAddress.entrance}</div>}
                                            {initialAddress.floor && <div>Этаж: {initialAddress.floor}</div>}
                                            {initialAddress.apartment && <div>Квартира: {initialAddress.apartment}</div>}
                                        </div>
                                    )}
                                    {initialAddress.comment && (
                                        <div className="address-order-modal-view-comment">
                                            <span className="icon">📝</span>
                                            {initialAddress.comment}
                                        </div>
                                    )}
                                </div>
                            </div>
                        {/* </div> */}

                        <div className="address-order-modal-view-map" id="address-order-modal-map" />
                    </div>
                }
            </div>

            {/* Локальные уведомления */}
            <div className="address-order-modal-notifications">
                {localNotifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`address-order-modal-notification ${notification.type}`}
                    >
                        {notification.message}
                    </div>
                ))}
            </div>

        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );

}

export default AddressOrderModal;