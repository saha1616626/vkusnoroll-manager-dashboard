// Страница для управления заказами пользователей

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Импорт компонентов
import RefreshButton from '../../components/dynamic/RefreshButton';
import Loader from './../dynamic/Loader';  // Анимация загрузки данных
import FilterButton from "./../ui/FilterButton"; // Кнопка фильтра
import FilterMenu from './../ui/FilterMenu'; // Меню фильтра
import CustomTable from './../ui/CustomTable'; // Таблица
import DropdownColumnSelection from './../ui/DropdownColumnSelection'; // Выбор отображаемых колонок в таблице
import DropdownButtonChange from './../ui/DropdownButtonChange'; // Кнопка "Изменить". Функции: удалить заказ, изменить статус оплаты и изменить статус заказа
import SearchInput from './../ui/SearchInput'; // Поле поиска
import api from '../../utils/api'; // API сервера
import PaginationBar from '../ui/PaginationBar'; // Панель разбиения контента на страницы
import DropdownStatusSelection from '../ui/DropdownStatusSelection';  // Выбор отображаемых кнопок со статусами заказов
import ChangeOrderStatusesModal from '../modals/ChangeOrderStatusesModal'; // Модальное окно для смены статусов у заказов (массово)
import ChangeOrderPaymentStatusesModal from '../modals/ChangeOrderPaymentStatusesModal'; // Модальное окно для смены статусов оплаты у заказов (массово)
import ConfirmationModal from '../modals/ConfirmationModal'; // Модальное окно для подтверждения удаления данных

// Импорт иконок
import addIcon from './../../assets/icons/add.png'

// Импорт стилей
import './../../styles/pages/ordersPage.css';

const OrdersPage = () => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const pageId = 'orders-page'; // Уникальный идентификатор страницы
    const timeOut = 500; // Задержка перед отключением анимации загрузки данных
    const navigate = useNavigate();
    const location = useLocation();
    const searchInputRef = React.useRef(); // Ссылка на поле поиска

    const [isLoading, setIsLoading] = useState(true); // Анимация загрузки данных

    // Фильтр
    const [isFiltersInitialized, setIsFiltersInitialized] = useState(false); // Отслеживание инициализации фильтров
    const [filters, setFilters] = useState([]); // Массив функций фильтра
    const [filterState, setFilterState] = useState({ // Управление состоянием фильтра (закрытый фильтр по умолчанию)
        isOpen: false, // Меню закрыто
        isActive: false, // Кнопка не нажата
        formData: {} // Поля фильтрации пустые
    });
    const [activeFilters, setActiveFilters] = useState({}); // Состояние хранения данных полей фильтра

    // Таблица
    const defaultColumns = ['Номер', 'Дата и время оформления', 'Сумма', 'Дата и время доставки', 'Статус заказа', 'Статус оплаты', 'Способ оплаты', 'Адрес доставки']; // Колонки для отображения по умолчанию
    const columnOptions = [...defaultColumns, 'Комментарий клиента', 'Комментарий менеджера', 'Имя клиента', 'Телефон клиента']; // Массив всех возможных колонок для отображения в таблице
    const [selectedColumns, setSelectedColumns] = useState(defaultColumns); // Отображаемые столбцы таблицы
    const [rawData, setRawData] = useState([]); // Оригинальные данные с сервера
    const [filteredData, setFilteredData] = useState([]); // Отфильтрованные данные для отображения
    const [selectedOrdersIds, setSelectedOrdersIds] = useState([]);  // Массив выбранных строк в таблице

    // Управление пагинацией
    const [currentPage, setCurrentPage] = useState(0); // Текущая страница
    const [totalOrders, setTotalOrders] = useState(0); // Общее количество заказов
    const itemsPerPage = 15; // Кол-во элементов в списке на отображение

    // Статусы
    const [activeStatuses, setActiveStatuses] = useState([]); // Выбранные статусы заказов

    // Модальное окно для смены статусов у заказов (массово)
    const [showChangeOrderStatusesModal, setShowChangeOrderStatusesModal] = useState(false); // Отображение модального окна

    // Модальное окно для смены статусов оплаты у заказов (массово)
    const [showChangeOrderPaymentStatusesModal, setShowChangeOrderPaymentStatusesModal] = useState(false); // Отображение модального окна

    // Модальное окно для подтверждения удаления данных
    const [showDeleteOrdersModal, setShowDeleteOrdersModal] = useState(false); // Отображение модального окна

    /* 
    ===========================
     Навигация и CRUD операции
    ===========================
    */
    const handleAddClick = () => navigate('/orders/new'); // Переход на страницу добавления
    const handleEditClick = (order) => navigate(`/orders/edit/${order.id}`); // Переход на страницу редактирования
    const handleRowClick = (rowData) => { // Обработчик клика по строке в таблице
        const originalData = rawData.find(order => order.id === rowData.id); // Получаем исходные данные по id из выбранной строки
        if (originalData) handleEditClick(originalData); // Передаем данные выбранной строки и запускаем страницу для редактирования
    };

    /* 
    ===========================
     Управление данными
    ===========================
    */

    // Функция загрузки данных из БД
    const fetchData = useCallback(async () => {
        setIsLoading(true); // Включаем анимацию загрузки данных
        if (isFiltersInitialized) { // Проверка, что фильтры инициализировались
            try {
                // Параметры запроса
                const params = {
                    page: currentPage + 1,
                    limit: itemsPerPage,
                    ...activeFilters // Все активные фильтры
                };

                const response = await api.getOrders(params);
                if (response.data) {
                    setRawData(response.data.data); // Оригинальные данные с сервера
                    const total = Number(response.data.total) || 0; // Гарантированное число заказов
                    setTotalOrders(total); // Общее количество заказов
                    setFilteredData(transformData(response.data.data));
                }
            } catch (error) {
                console.error('Ошибка загрузки заказов:', error);
                setTotalOrders(0); // Сбрасываем total при ошибке
            } finally { // Выключаем анимацию загрузки данных
                setTimeout(() => setIsLoading(false), timeOut);
            }
        }
    }, [currentPage, activeFilters, isFiltersInitialized]); // Вызываем обновление списка при переключении страниц списка

    // Трансформация данных для представления в таблице
    const transformData = (data) => data.map(order => {

        // Форматирование даты и времени оформления (обрезаем миллисекунды)
        const formatDateTime = (datetime) => {
            if (!datetime) return '—';

            const date = new Date(datetime);

            const datePart = date.toLocaleDateString('ru-RU', {
                timeZone: 'Europe/Moscow',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });

            const timePart = date.toLocaleTimeString('ru-RU', {
                timeZone: 'Europe/Moscow',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `${datePart} ${timePart}`;
        };

        // Форматирование диапазона доставки
        const formatDeliveryRange = (start, end) => {
            if (!start || !end) return '—';

            const startDateObj = new Date(start);
            const endDateObj = new Date(end);

            // Форматируем дату
            const formatDate = (date) =>
                date.toLocaleDateString('ru-RU', {
                    timeZone: 'Europe/Moscow',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                });

            // Форматируем время
            const formatTime = (date) =>
                date.toLocaleTimeString('ru-RU', {
                    timeZone: 'Europe/Moscow',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                });

            const startDateStr = formatDate(startDateObj);
            const startTimeStr = formatTime(startDateObj);
            const endDateStr = formatDate(endDateObj);
            const endTimeStr = formatTime(endDateObj);

            if (startDateStr === endDateStr) {
                return `${startDateStr} ${startTimeStr} - ${endTimeStr}`;
            } else {
                return `${startDateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr}`;
            }
        };


        // Формирование адреса доставки
        const formatAddress = (addr) => {
            if (!addr) return '—';
            const parts = [
                addr.city,
                addr.street,
                `д. ${addr.house}`,
                addr.apartment ? `кв. ${addr.apartment}` : null
            ].filter(Boolean);
            return parts.join(', ');
        };

        return {
            id: order.id,
            'Номер': order.orderNumber || '—',
            'Дата и время оформления': formatDateTime(order.orderPlacementTime),
            'Сумма': `${(Number(order.goodsCost) + Number(order.shippingCost)).toFixed(2)} ₽`,
            'Дата и время доставки': formatDeliveryRange(
                order.startDesiredDeliveryTime,
                order.endDesiredDeliveryTime
            ),
            'Статус заказа': order.status?.name || 'Новый',
            'Статус оплаты': order.isPaymentStatus ? 'Оплачен' : 'Не оплачен',
            'Способ оплаты': order.paymentMethod || '—',
            'Адрес доставки': formatAddress(order.deliveryAddress),
            'Комментарий клиента': order.commentFromClient || '—',
            'Комментарий менеджера': order.commentFromManager || '—',
            'Имя клиента': order.nameClient || '—',
            'Телефон клиента': order.numberPhoneClient || '—'
        };
    });

    // Обновление данных на странице (иконка). Без сброса списка пагинации
    const refreshData = async () => {
        // Обновляем активные фильтры
        setActiveFilters(prev => {
            const newFilters = {
                ...prev,
                orderStatus: filterState.formData.orderStatus, // Перезаписываем orderStatus
                isPaymentStatus: filterState.formData.isPaymentStatus,
                paymentMethod: filterState.formData.paymentMethod,
                date: {
                    start: filterState.formData.date?.start,
                    end: filterState.formData.date?.end
                },
                sort: filterState.formData.sort,
                search: searchInputRef.current.search() // Устанавливаем значение поиска
            };

            // Создаем копию newFilters БЕЗ поля search для filterState
            const { search, ...formDataWithoutSearch } = newFilters;

            // Сохраняем новые фильтры в filterState (без search)
            const newFilterState = {
                ...filterState,
                formData: formDataWithoutSearch
            };

            // Сохраняем в localStorage
            saveFilterState(newFilterState);

            // Обновляем состояние filterState (без search)
            setFilterState(prev => ({
                ...prev,
                formData: formDataWithoutSearch
            }));

            return newFilters;
        });
    };

    /* 
    ===========================
     Управление фильтром
    ===========================
    */

    // Сохранение состояния фильтров
    const saveFilterState = (state) => {
        localStorage.setItem(`filterState_${pageId}`, JSON.stringify({
            ...state,
            formData: {
                ...state.formData,
            }
        }));
    };

    // Получение списка статусов заказа
    const fetchOrderStatuses = async () => {
        try {
            const response = await api.getOrderStatuses();

            // Проверяем наличие данных
            if (!response.data || !Array.isArray(response.data)) { throw new Error('Invalid order statuses data'); }

            // Добавляем системный статус
            const systemStatuses = [
                { id: 'null', name: 'Новый', sequenceNumber: -1 }
            ];

            const allStatuses = [...systemStatuses, ...response.data]
                .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

            return allStatuses.map(status => ({
                id: status.id,
                name: status.name
            }));
        } catch (error) {
            console.error('Error:', error.response ? error.response.data : error.message);
            return [];
        }
    };

    // Конфигурация фильтра
    const initFilters = (orderStatuses) => {
        setFilters([
            {
                type: 'date-range',
                name: 'simpleDate',
                label: 'Период оформления'
            },
            {
                type: 'multi-select',
                name: 'orderStatus',
                label: 'Статус заказа',
                options: orderStatuses,
                placeholder: 'Выберите статус(ы)'
            },
            { type: 'select', name: 'isPaymentStatus', label: 'Статус оплаты', options: ['Оплачен', 'Не оплачен'] },
            {
                type: 'multi-select',
                name: 'paymentMethod',
                label: 'Способ оплаты',
                options: [
                    { id: 'online', name: 'Онлайн' },
                    { id: 'cash', name: 'Наличные' },
                    { id: 'card', name: 'Картой при получении' }
                ],
                placeholder: 'Выберите способ(ы)'
            },
            {
                type: 'sort',
                name: 'sort',
                label: 'Сортировка',
                options: [
                    {
                        type: 'orderDate',
                        label: 'По дате заказа',
                        subOptions: [
                            { value: 'desc', label: 'Новые' },
                            { value: 'asc', label: 'Старые' }
                        ]
                    },
                    {
                        type: 'deliveryDate',
                        label: 'По дате доставки',
                        subOptions: [
                            { value: 'asc', label: 'Ближе' },
                            { value: 'desc', label: 'Дальше' }
                        ]
                    }
                ]
            }
        ]);
    };

    // Нажатие на статус для быстрой фильтрации
    const handleStatusClick = (statusId, statusName) => {

        const orderStatus = statusId === 'all' ? [] : [{ id: statusId, name: statusName }];

        searchInputRef.current?.clear(); // Очистка поля поиска

        // Обновляем активные фильтры
        setActiveFilters(prev => {
            const newFilters = {
                ...prev,
                orderStatus: orderStatus, // Перезаписываем orderStatus
                isPaymentStatus: filterState.formData.isPaymentStatus,
                paymentMethod: filterState.formData.paymentMethod,
                date: {
                    start: filterState.formData.date?.start,
                    end: filterState.formData.date?.end
                },
                sort: filterState.formData.sort,
                search: ''
            };

            // Сохраняем новые фильтры в filterState
            const newFilterState = {
                ...filterState,
                formData: newFilters
            };

            // Сохраняем в localStorage
            saveFilterState(newFilterState);

            // Обновляем состояние фильтра для синхронизации
            setFilterState(prev => ({
                ...prev,
                formData: newFilters
            }));

            return newFilters;
        });

    };

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
            const serverFilters = {
                orderStatus: filterState.formData.orderStatus,
                isPaymentStatus: filterState.formData.isPaymentStatus,
                paymentMethod: filterState.formData.paymentMethod,
                date: {
                    start: filterState.formData.date?.start,
                    end: filterState.formData.date?.end
                },
                sort: filterState.formData.sort
            };

            setCurrentPage(0); // Сброс номера страницы списка пагинации
            searchInputRef.current?.clear(); // Очистка поля поиска

            // Сохраняем значения полей фильтра
            setActiveFilters(serverFilters);
            saveFilterState({ ...filterState, formData: serverFilters });
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
            setCurrentPage(0); // Сброс номера страницы списка пагинации

            setFilterState(prev => ({
                ...prev,
                formData: {
                    // Сохраняем дефолтную сортировку
                    sort: {
                        type: 'deliveryDate',
                        order: 'asc'
                    }
                }
            }));
            setActiveFilters({
                // Также применяем дефолтную сортировку для активных фильтров
                sort: {
                    type: 'deliveryDate',
                    order: 'asc'
                }
            });
            saveFilterState({
                isOpen: true,
                isActive: true,
                formData: {
                    sort: {
                        type: 'deliveryDate',
                        order: 'asc'
                    }
                }
            });
        } catch (error) {
            console.error('Filter reset error:', error);
        } finally {
            setTimeout(() => setIsLoading(false), timeOut);
        }
    };

    // Поле поиска
    const handleSearch = (term) => {
        // Обновляем активные фильтры
        setActiveFilters(prev => {
            const newFilters = {
                ...prev,
                orderStatus: filterState.formData.orderStatus, // Перезаписываем orderStatus
                isPaymentStatus: filterState.formData.isPaymentStatus,
                paymentMethod: filterState.formData.paymentMethod,
                date: {
                    start: filterState.formData.date?.start,
                    end: filterState.formData.date?.end
                },
                sort: filterState.formData.sort,
                search: term.trim()
            };

            // Создаем копию newFilters с полем search для filterState
            const { search, ...formDataWithoutSearch } = newFilters;

            // Сохраняем новые фильтры в filterState (без search)
            const newFilterState = {
                ...filterState,
                formData: formDataWithoutSearch
            };
            setCurrentPage(0); // Сброс номера страницы списка пагинации

            // Сохраняем в localStorage
            saveFilterState(newFilterState);

            // Обновляем состояние filterState (без search)
            setFilterState(prev => ({
                ...prev,
                formData: formDataWithoutSearch
            }));

            return newFilters;
        });
    };

    /* 
    ===========================
     Управление таблицей
    ===========================
    */

    // Выбор строк(и) в таблице
    const handleSelectionChange = (selectedIndices) => {
        const selectedIds = selectedIndices
            .map(index => filteredData[index]?.id)
            .filter(id => id !== undefined);
        setSelectedOrdersIds(selectedIds);
    };

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка данных в таблицу при монтировании текущей страницы
    useEffect(() => {
        // Обновляем данные на странице
        fetchData();
    }, [location.key, fetchData]);

    // Инициализация фильтров
    useEffect(() => {
        const loadOrders = async () => {
            const orderStatuses = await fetchOrderStatuses();
            initFilters(orderStatuses);

            const savedStateRaw = localStorage.getItem(`filterState_${pageId}`);
            const savedState = savedStateRaw ? JSON.parse(savedStateRaw) : null;

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
                formData: {
                    sort: { type: 'deliveryDate', order: 'asc' }
                }
            };

            setFilterState(savedState || defaultState);
            setActiveFilters(savedState?.formData || defaultState.formData);

            setIsFiltersInitialized(true); // Фильтры инициализировались
        };
        loadOrders();
    }, []);

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="page-container">
            <div className="control-components">
                <div className="grouping-groups-elements">
                    {/* Обновить страницу */}
                    <RefreshButton title="Обновить страницу" onRefresh={refreshData} />

                    {/* Заголовок страницы */}
                    <div className="page-title">
                        Заказы клиентов
                    </div>
                </div>

                <div className="grouping-elements">
                    {/* Кнопка добавить */}
                    <button className="button-control page-button-add"
                        onClick={handleAddClick}>
                        <img src={addIcon} alt="Update" className="page-icon-button" />
                        Заказ
                    </button>

                    {/* Кнопка фильтра */}
                    <FilterButton
                        isActive={filterState.isActive}
                        toggleFilter={toggleFilter}
                    />

                    {/*  Функции: удалить заказ, изменить статус оплаты и изменить статус заказа */}
                    <DropdownButtonChange
                        onDelete={() => {
                            if (selectedOrdersIds.length === 0) {
                                return;
                            }
                            setShowDeleteOrdersModal(true);
                        }}
                        onPaymentStatus={() => {
                            if (selectedOrdersIds.length === 0) {
                                return;
                            }
                            setShowChangeOrderPaymentStatusesModal(true);
                        }}
                        onOrderStatus={() => {
                            if (selectedOrdersIds.length === 0) {
                                return;
                            }
                            setShowChangeOrderStatusesModal(true);
                        }}
                    />

                    {/* Поиск */}
                    <SearchInput
                        ref={searchInputRef}
                        placeholder="Поиск заказа по номеру"
                        onSearch={handleSearch}
                    />

                    {/* Настройка статусов заказов */}
                    <DropdownStatusSelection
                        pageId={pageId}
                        onStatusChange={setActiveStatuses}
                    />

                    {/* Настройка колонок */}
                    <DropdownColumnSelection
                        options={columnOptions}
                        title="Колонки"
                        defaultSelected={defaultColumns}
                        setSelectedColumns={setSelectedColumns} // Передаем функцию для обновления выбранных колонок
                        pageId={pageId}
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

            {/* Горизонтальные кнопки выбранных статусов */}
            <div className="orders-page-status-buttons-container" style={{ display: !activeStatuses.length ? 'none' : '' }}>
                {activeStatuses
                    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                    .map(status => (
                        <button
                            key={status.id}
                            className="orders-page-status-button"
                            onClick={() => handleStatusClick(status.id, status.name)}
                        >
                            {status.name}
                        </button>
                    ))}
            </div>

            {/* Таблица */}
            <div className="page-table">
                {isLoading ? <Loader isWorking={isLoading} /> : <CustomTable // Отображение анимации загрузки при загрузке данных
                    columns={selectedColumns}
                    data={filteredData}
                    onSelectionChange={handleSelectionChange}
                    onRowClick={handleRowClick}
                    tableId={pageId}
                    centeredColumns={['Номер', 'Дата и время оформления', 'Пользователь']}  // Cписок центрируемых колонок
                />}
            </div>

            {/* Панель для управления пагинацией */}
            <div>
                {!isLoading &&  (
                    <PaginationBar
                        totalItems={totalOrders}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {/* Модальное окно для смены статусов у заказов (массово) */}
            <ChangeOrderStatusesModal
                isOpen={showChangeOrderStatusesModal}
                selectedOrderIds={selectedOrdersIds}
                onConfirm={async (newStatusId) => {
                    try {
                        await api.changeOrderStatuses(selectedOrdersIds, newStatusId);
                        await fetchData();
                        setSelectedOrdersIds([]);
                    } catch (error) {
                        console.error("Ошибка изменения статусов:", error);
                    }
                    setShowChangeOrderStatusesModal(false);
                }}
                onCancel={() => setShowChangeOrderStatusesModal(false)}
            />

            {/* Модальное окно для смены статусов оплаты у заказов (массово) */}
            <ChangeOrderPaymentStatusesModal
                isOpen={showChangeOrderPaymentStatusesModal}
                selectedOrderIds={selectedOrdersIds}
                onConfirm={async (newStatusPayment) => {
                    try {
                        await api.changeOrderPaymentStatuses(selectedOrdersIds, newStatusPayment);
                        await fetchData();
                        setSelectedOrdersIds([]);
                    } catch (error) {
                        console.error("Ошибка изменения статусов оплаты:", error);
                    }
                    setShowChangeOrderPaymentStatusesModal(false);
                }}
                onCancel={() => setShowChangeOrderPaymentStatusesModal(false)}
            />

            {/* Модальное окно для подтверждения удаления данных */}
            <ConfirmationModal
                isOpen={showDeleteOrdersModal}
                title={selectedOrdersIds.length === 1
                    ? "Вы уверены, что хотите удалить заказ?"
                    : "Вы уверены, что хотите удалить список заказов?"
                }
                message={'Подтвердите действие'}
                onConfirm={async () => {
                    try {
                        await api.deleteOrders(selectedOrdersIds);
                        await fetchData();
                        setSelectedOrdersIds([]);
                    } catch (error) {
                        console.error("Ошибка удаления заказов:", error);
                    }
                    setShowDeleteOrdersModal(false);
                }}
                onCancel={() => setShowDeleteOrdersModal(false)}
            />

        </div>
    );
}
export default OrdersPage;
