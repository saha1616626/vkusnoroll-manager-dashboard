// Модальное окно для добавления товара в заказ

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

// Импорт компонентов
import api from '../../utils/api';
import Loader from '../dynamic/Loader';  // Анимация загрузки данных
import SearchInput from '../ui/SearchInput'; // Поле поиска
import FilterButton from "../ui/FilterButton"; // Кнопка фильтра
import FilterMenu from '../ui/FilterMenu'; // Меню фильтра
import RefreshButton from '../../components/dynamic/RefreshButton';

// Импорт иконок
import crossIcon from './../../assets/icons/cross.png'; // Крестик

// Импорт стилей
import './../../styles/modals/orderAddItemsModal.css'

const OrderAddItemsModal = ({ isOpen, onCancel, onSave, existingItems = [] }) => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const searchInputRef = React.useRef(); // Ссылка на поле поиска
    const modalRef = useRef(null); // Ссылка на окно
    const timeOut = 500; // Задержка перед отключением анимации загрузки данных
    const modalId = 'order-add-items-modal'; // Уникальный идентификатор модального окна

    const [isLoading, setIsLoading] = useState(true); // Анимация загрузки данных

    const [dishes, setDishes] = useState([]); // Список блюд
    const [quantities, setQuantities] = useState({}); // Выбранное кол-во для каждого товара
    const [filteredDishes, setFilteredDishes] = useState([]); // Отфильтрованный список блюд

    const [filters, setFilters] = useState([]); // Массив функций фильтра
    const [filterState, setFilterState] = useState({ // Управление состоянием фильтра (закрытый фильтр по умолчанию)
        isOpen: false, // Меню закрыто
        isActive: false, // Кнопка не нажата
        formData: {} // Поля фильтрации пустые
    });
    const [activeFilters, setActiveFilters] = useState({}); // Состояние хранения данных полей фильтра
    const [searchQuery, setSearchQuery] = useState(''); // Поисковый запрос

    /* 
    ===========================
     Управление данными
    ===========================
    */

    // Функция загрузки данных из БД
    const fetchData = useCallback(async () => {
        setIsLoading(true); // Включаем анимацию загрузки данных
        try {
            // Получение списка блюд без изображения и те товары, которые не в архиве, и их категория не в архиве
            const dishesRes = await api.getUnarchivedDishesNoImageWithActiveCategory();

            setDishes(dishesRes.data);
            setFilteredDishes(dishesRes.data);
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        } finally { // Выключаем анимацию загрузки данных
            setTimeout(() => setIsLoading(false), timeOut);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps 

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка данных
    useEffect(() => {
        if (!isOpen) return;
        fetchData();
    }, [isOpen]);  // eslint-disable-line react-hooks/exhaustive-deps 

    // Инициализация количеств на основе существующих товаров
    useEffect(() => {
        if (!isOpen || !dishes.length) return;

        // Создаем объект с 0 для всех блюд
        const initialQuantities = dishes.reduce((acc, dish) => {
            acc[dish.id] = 0;
            return acc;
        }, {});

        // Перезаписываем значения для существующих товаров
        existingItems.forEach(item => {
            initialQuantities[item.dishId] = item.quantityOrder;
        });

        setQuantities(initialQuantities);
    }, [dishes]); // eslint-disable-line react-hooks/exhaustive-deps 

    // Инициализация фильтров
    useEffect(() => {
        const loadOrders = async () => {
            const categories = await fetchCategories();
            initFilters(categories);

            const savedStateRaw = localStorage.getItem(`filterState_${modalId}`);
            const savedState = savedStateRaw ? JSON.parse(savedStateRaw) : null; // Получаем сохраненные фильтры

            if (savedState?.formData?.sort) {
                try {
                    // Проверяем, нужно ли парсить sort (если это строка)
                    savedState.formData.sort = typeof savedState.formData.sort === 'string'
                        ? JSON.parse(savedState.formData.sort)
                        : savedState.formData.sort;
                } catch (e) {
                    console.error('Error parsing sort filter:', e);
                    savedState.formData.sort = null;
                }
            }

            // Если нет сохраненного состояния - устанавливаем дефолтную сортировку
            const defaultState = {
                isOpen: false,
                isActive: false,
                formData: {}
            };

            setFilterState(savedState || defaultState);
            setActiveFilters(savedState?.formData || defaultState.formData);
        };
        loadOrders();
    }, []);

    // Обработчик клика вне модального окна
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onCancel(); // Закрываем окно
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onCancel]);

    // Обработчик нажатия на Escape
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') onCancel(); // Закрыть окно при нажатии кнопки "Escape"
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onCancel]);

    // Убираем скролл с перекрытой страницы
    useEffect(() => {
        if (isOpen && isLoading === false) {
            document.body.classList.add('no-scroll');
            return () => document.body.classList.remove('no-scroll');
        }
    }, [isOpen, isLoading]);

    // Эффект для применения фильтров и поиска
    useEffect(() => {
        if (!dishes.length) return;

        const filtered = applyFiltersAndSearch(dishes, activeFilters, searchQuery);
        setFilteredDishes(filtered);
    }, [dishes, activeFilters, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps 

    /* 
    ===========================
     Управление фильтром
    ===========================
    */

    // Кнопка закрыть/открыть меню фильтра
    const toggleFilter = () => {
        setFilterState(prev => { // Обновление состояния фильтра
            const newState = {
                ...prev,
                isOpen: !prev.isOpen, // Управление меню
                isActive: !prev.isActive // Управление кнопкой
            };
            saveFilterState(newState); // Сохраняем состояние фильтра в localStorage
            return newState;
        });
    };

    // Сохранение состояния фильтров
    const saveFilterState = (state) => {
        localStorage.setItem(`filterState_${modalId}`, JSON.stringify({
            ...state,
            formData: {
                ...state.formData,
            }
        }));
    };

    // Конфигурация фильтра
    const initFilters = (categories) => {
        setFilters([
            {
                type: 'multi-select',
                name: 'categories',
                label: 'Категория',
                options: categories,
                placeholder: 'Выберите категорию(и)'
            },
            { type: 'number', name: 'weight', label: 'Вес (г)', placeholder: '' },
            { type: 'number', name: 'volume', label: 'Объём (л)', placeholder: '' },
            { type: 'number', name: 'quantityInSet', label: 'Кол-во в наборе (шт)', placeholder: '' }
        ]);
    }

    // Фильтрация данных
    const applyFiltersAndSearch = useCallback((data, filters, search) => {
        let result = data;

        // Применяем текстовый поиск
        if (search.trim()) {
            result = result.filter(dish =>
                dish.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Фильтрация по категориям (только если есть выбранные категории)
        if (filters.categories && filters.categories.length > 0) {
            const categoryIds = filters.categories.map(cat => cat.id);
            result = result.filter(dish => categoryIds.includes(dish.categoryId));
        }

        // Фильтрация по весу (проверяем, что значение не пустое и валидное)
        if (filters.weight && filters.weight.trim() !== "" && !isNaN(filters.weight)) {
            const weight = parseFloat(filters.weight);
            result = result.filter(dish => dish.weight === weight);
        }

        // Фильтрация объему (проверяем, что значение не пустое и валидное)
        if (filters.volume && filters.volume.trim() !== "" && !isNaN(filters.volume)) {
            const volume = parseFloat(filters.volume);
            result = result.filter(dish => dish.volume === volume);
        }

        // Фильтрация по кол-ву штук в наборе (проверяем, что значение не пустое и валидное)
        if (filters.quantityInSet && filters.quantityInSet.trim() !== "" && !isNaN(filters.quantityInSet)) {
            const quantity = parseFloat(filters.quantityInSet);
            result = result.filter(dish => dish.quantity === quantity);
        }

        return result;
    }, []); // Все используемые данные в фильтрах

    // Получение списка категорий
    const fetchCategories = async () => {
        try {
            const response = await api.getCategories();

            // Проверяем наличие данных
            if (!response.data || !Array.isArray(response.data)) { throw new Error('Invalid categories data'); }

            return response.data.map(category => ({
                id: category.id,
                name: category.name
            }));
        } catch (error) {
            console.error('Error:', error.response ? error.response.data : error.message);
            return [];
        }
    };

    // Обновление данных формы фильтров (Введенные значения в поля)
    const handleFilterFormUpdate = (name, value) => {
        setFilterState(prev => ({
            ...prev,
            formData: { ...prev.formData, [name]: value }
        }));
    };

    // Кнопка "Поиск" в фильтре
    const handleFilterSearch = () => {
        setIsLoading(true); // Включаем анимацию загрузки данных
        try {
            // Нормализуем данные перед отправкой
            searchInputRef.current?.clear(); // Очистка поля поиска
            setSearchQuery('');

            // Сохраняем значения полей фильтра
            setActiveFilters(filterState.formData);
            saveFilterState({ ...filterState, formData: filterState.formData }); // Сохраняем состояние фильтра в localStorage
        } catch (error) {
            console.error('Filter search error:', error);
        } finally {
            setTimeout(() => setIsLoading(false), timeOut);
        }
    };

    // Кнопка "Очистка" в фильтре
    const handleFilterReset = () => {
        setIsLoading(true);
        try {
            searchInputRef.current?.clear(); // Очистка поля поиска
            setSearchQuery('');

            setFilterState({ ...filterState, formData: {} });
            saveFilterState({ ...filterState, formData: {} });
            setActiveFilters({});
        } catch (error) {
            console.error('Filter reset error:', error);
        } finally {
            setTimeout(() => setIsLoading(false), timeOut);
        }
    };

    // Обновление данные на странице (Иконка)
    const refreshData = async () => {
        setIsLoading(true);
        try {
            await fetchData();
            // Принудительно обновляем фильтрацию после загрузки новых данных
            setSearchQuery(searchInputRef.current.search()); // Устанавливаем значение поиска
            setActiveFilters(filterState.formData); // Сохраняем значения полей фильтра
            saveFilterState({ ...filterState, formData: filterState.formData }); // Сохраняем состояние фильтра в localStorage
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setTimeout(() => setIsLoading(false), timeOut);
        }
    };

    // Обработчик поиска
    const handleSearch = (term) => {
        setIsLoading(true);
        try {
            setSearchQuery(term);
            setActiveFilters(filterState.formData);
            saveFilterState({ ...filterState, formData: filterState.formData }); // Сохраняем состояние фильтра в localStorage
        } catch (error) {
            console.error('Filter search error:', error);
        } finally {
            setTimeout(() => setIsLoading(false), timeOut);
        }
    };

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Обработчик изменения количества
    const handleQuantityChange = (dishId, value) => {
        // Храним null вместо пустой строки для корректной работы ?? 
        setQuantities(prev => ({
            ...prev,
            [dishId]: value === "" ? null : Math.max(0, Number(value))
        }));
    };

    // Обработчик сохранения
    const handleSave = () => {
        const selectedItems = dishes
            .filter(dish => quantities[dish.id] > 0)
            .map(dish => ({
                dishId: dish.id,
                name: dish.name,
                categoryId: dish.categoryId,
                categoryName: dish.category,
                quantity: quantities[dish.id], // Используем текущее значение из состояния
                originalPrice: existingItems.find(i => i.dishId === dish.id)?.pricePerUnit || dish.price
            }));

        onSave(selectedItems);
        onCancel();
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="order-add-modal-overlay">

            <button
                onClick={() => onCancel()}
                className="order-add-modal-close-button"
                aria-label="Закрыть форму"
            >
                <img src={crossIcon} alt="Cross" />
            </button>

            <div className={`order-add-modal ${isOpen ? 'active' : ''}`} ref={modalRef}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignContent: 'flex-start' }}>
                    <div className="control-components order-add-modal-header-container">

                        <div className="grouping-groups-elements">
                            {/* Обновить страницу */}
                            <RefreshButton title="Обновить страницу" onRefresh={refreshData} />
                        </div>

                        {/* Заголовок */}
                        <div className="order-add-modal-header">
                            Добавить позицию
                        </div>

                        {/* Поиск и фильтр */}
                        <div className="grouping-elements">
                            {/* Поиск */}
                            <SearchInput
                                ref={searchInputRef}
                                placeholder="Поиск по названию"
                                onSearch={handleSearch}
                            />
                            <FilterButton
                                isActive={filterState.isActive}
                                toggleFilter={toggleFilter}
                            />
                        </div>
                    </div>

                    {/* Меню фильтра */}
                    <div className="page-filter">
                        <FilterMenu
                            isOpen={filterState.isOpen}
                            filters={filters}
                            formData={filterState.formData}
                            onFormUpdate={handleFilterFormUpdate}
                            onSearch={handleFilterSearch}
                            onReset={handleFilterReset}
                        />
                    </div>

                    {isLoading ?
                        <div>
                            <Loader isWorking={isLoading} />
                        </div>
                        :
                        <>
                            {/* Список товаров */}
                            <div className="order-add-items-modal-list">
                                {filteredDishes.length === 0 ? (
                                    <div className="order-add-items-modal-empty-list-message">
                                        Список пуст
                                        <div className="order-add-items-modal-empty-list-sub">Попробуйте изменить параметры поиска</div>
                                    </div>
                                ) : (
                                    filteredDishes.map(dish => (
                                        <div key={dish.id} className="order-add-items-modal-item">
                                            <div className="order-add-items-modal-main">
                                                {/* Название и категория в одной строке */}
                                                <div className="order-add-items-modal-header">
                                                    <h4 className="order-add-items-modal-title">{dish.name}</h4>
                                                    <span className="order-add-items-modal-category">{dish.category}</span>

                                                    <div className="order-add-items-modal-props">
                                                        {dish.isWeight && <span>{dish.weight}г</span>}
                                                        {dish.isVolume && <span>{dish.volume}мл</span>}
                                                        {dish.isQuantitySet && <span>{dish.quantity}шт</span>}
                                                    </div>
                                                </div>

                                                {/* Свойства и цена в одной строке */}
                                                <div className="order-add-items-modal-details">
                                                    <div className="order-add-items-modal-price">{dish.price} ₽</div>
                                                </div>
                                            </div>

                                            <div className="order-add-items-modal-quantity">
                                                <button
                                                    className="order-add-items-modal-quantity-btn"
                                                    onClick={() => handleQuantityChange(dish.id, Math.max(0, (quantities[dish.id] || 0) - 1))}
                                                >
                                                    <svg width="14" height="2" viewBox="0 0 14 2" fill="none">
                                                        <path d="M0 1H14" stroke="currentColor" strokeWidth="2" />
                                                    </svg>
                                                </button>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={quantities[dish.id] ?? ""}
                                                    onChange={(e) => handleQuantityChange(dish.id, e.target.value)}
                                                    onBlur={(e) => {
                                                        // Принудительно устанавливаем 0 для пустых значений
                                                        if (e.target.value === "" || isNaN(quantities[dish.id])) {
                                                            setQuantities(prev => ({
                                                                ...prev,
                                                                [dish.id]: 0
                                                            }));
                                                        }
                                                    }}
                                                />
                                                <button
                                                    className="order-add-items-modal-quantity-btn"
                                                    onClick={() => handleQuantityChange(dish.id, (quantities[dish.id] || 0) + 1)}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                        <path d="M6 0H8V6H14V8H8V14H6V8H0V6H6V0Z" fill="currentColor" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>}
                </div>

                {/* Кнопки */}
                <div className="order-add-modal-actions">
                    <button
                        type="button"
                        className="button-control order-add-close-btn"
                        onClick={onCancel}
                    >
                        Закрыть
                    </button>
                    <button
                        type="button"
                        className="button-control order-add-save-btn"
                        onClick={() => handleSave()}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
}

export default OrderAddItemsModal;