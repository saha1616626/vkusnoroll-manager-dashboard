// Модальное окно для добавления товара в заказ

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

// Импорт компонентов
import api from '../../utils/api';
import Loader from '../dynamic/Loader';  // Анимация загрузки данных
import SearchInput from '../ui/SearchInput'; // Поле поиска
import FilterButton from "../ui/FilterButton"; // Кнопка фильтра
import FilterMenu from '../ui/FilterMenu'; // Меню фильтра

// Импорт иконок

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

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка данных
    useEffect(() => {
        const fetchDishes = async () => {
            try {
                // Получение списка блюд без изображения и те товары, которые не в архиве, и их категория не в архиве
                const dishesRes = await api.getUnarchivedDishesNoImageWithActiveCategory();

                setDishes(dishesRes.data);
                setFilteredDishes(dishesRes.data);
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
        };
        fetchDishes();
    }, []);

    // Инициализация количеств на основе существующих товаров
    useEffect(() => {
        const initialQuantities = {};
        existingItems.forEach(item => {
            initialQuantities[item.dishId] = item.quantityOrder;
        });
        setQuantities(initialQuantities);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps 

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
        if (isOpen) {
            document.body.classList.add('no-scroll');
            return () => document.body.classList.remove('no-scroll');
        }
    }, [isOpen]);


    /* 
    ===========================
     Управление фильтром
    ===========================
    */

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

            // Сохраняем значения полей фильтра
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

            setFilterState({});
            setActiveFilters({});
        } catch (error) {
            console.error('Filter reset error:', error);
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
        setQuantities(prev => ({
            ...prev,
            [dishId]: Number(value) || 0
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
            <div className="order-add-modal" ref={modalRef}>
                {/* Заголовок */}
                <div className="order-add-modal-header">
                    Добавить товары в заказ
                </div>

                {/* Поиск и фильтр */}
                <div className="order-add-search-filter">
                    <input
                        type="text"
                        placeholder="Поиск блюда"
                        // value={searchQuery}
                        // onChange={(e) => setSearchQuery(e.target.value)}
                        className="order-add-search-input"
                    />
                    <FilterButton
                        isActive={filterState.isActive}
                        toggleFilter={() => setFilterState(prev => ({
                            ...prev,
                            isOpen: !prev.isOpen
                        }))}
                    />
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

                {/* Список товаров */}
                <div className="order-add-dishes-list">
                    {filteredDishes.map(dish => (
                        <div key={dish.id} className="order-add-dish-item">
                            <div className="order-add-dish-info">
                                <h4>{dish.name}</h4>
                                <h4>{dish.category}</h4>
                                <div className="order-add-dish-props">
                                    {dish.isWeight && <span>{dish.weight} г</span>}
                                    {dish.isVolume && <span>{dish.volume} мл</span>}
                                    {dish.isQuantitySet && <span>{dish.quantity} шт</span>}
                                </div>
                                <div className="order-add-dish-price">{dish.price} ₽</div>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={quantities[dish.id] || ''}
                                onChange={(e) => handleQuantityChange(dish.id, e.target.value)}
                                className="order-add-quantity-input"
                            />
                        </div>
                    ))}
                </div>

                {/* Кнопки */}
                <div className="order-add-modal-actions">
                    <button
                        type="button"
                        className="order-add-close-btn"
                        onClick={onCancel}
                    >
                        Закрыть
                    </button>
                    <button
                        type="button"
                        className="order-add-save-btn"
                        onClick={() => handleSave()}
                    >
                        Выбрать
                    </button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
}
export default OrderAddItemsModal;
