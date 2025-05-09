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

    const [isLoading, setIsLoading] = useState(true); // Анимация загрузки данных

    // Фильтр
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

    /* 
    ===========================
     Навигация и CRUD операции
    ===========================
    */
    const handleAddClick = () => navigate('/orders/new', { replace: true }); // Переход на страницу добавления
    const handleEditClick = (order) => navigate(`/orders/edit/${order.id}`, { replace: true }); // Переход на страницу редактирования
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
        try {
            const response = await api.getOrders(currentPage + 1, itemsPerPage);
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
    }, [currentPage]); // Вызываем обновление списка при переключении страниц списка

    // Трансформация данных для представления в таблице
    const transformData = (data) => data.map(order => {
        // Форматирование даты и времени оформления (обрезаем миллисекунды)
        const formatDateTime = (datetime) => {
            if (!datetime) return '—';
            return datetime.slice(0, 16).replace('T', ' ');
        };

        // Форматирование диапазона доставки
        const formatDeliveryRange = (start, end) => {
            if (!start || !end) return '—';

            const startDate = start.slice(0, 10);
            const startTime = start.slice(11, 16);
            const endDate = end.slice(0, 10);
            const endTime = end.slice(11, 16);

            return startDate === endDate
                ? `${startDate} ${startTime} - ${endTime}`
                : `${startDate} ${startTime} - ${endDate} ${endTime}`;
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

    // Обновление данные на странице (Иконка)
    const refreshData = async () => {

    };

    /* 
    ===========================
     Управление фильтром
    ===========================
    */

    // Сохранение состояния фильтров
    const saveFilterState = (state) => {
        localStorage.setItem(`filterState_${pageId}`, JSON.stringify(state));
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
                    {id: 'online', name: 'Онлайн'},
                    {id: 'cash', name: 'Наличные'},
                    {id: 'card', name: 'Картой при получении'}
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
    const handleStatusClick = (statusId) => {
        const statusIds = activeStatuses.map(s => s.id);
        // setSelectedStatuses(prev =>
        //     prev.filter(id => id !== statusId && id !== 'all')
        // );
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
            // Сохраняем значения полей фильтра
            setActiveFilters(filterState.formData);
            saveFilterState({ ...filterState, formData: filterState.formData });
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
            setFilterState(prev => ({
                ...prev,
                formData: {}
            }));
            setActiveFilters({});
            saveFilterState({
                isOpen: true,
                isActive: true,
                formData: {}
            });
        } catch (error) {
            console.error('Filter reset error:', error);
        } finally {
            setTimeout(() => setIsLoading(false), timeOut);
        }
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
        const loadCategories = async () => {
            const orderStatuses = await fetchOrderStatuses();
            initFilters(orderStatuses);
            const savedState = localStorage.getItem(`filterState_${pageId}`);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                setFilterState(parsedState);
                setActiveFilters(parsedState.formData); // Восстанавливаем активные фильтры
            }
        };
        loadCategories();
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
                    // onDelete={() => handleDelete()}
                    // onPaymentStatus={() => setShowPaymentModal(true)}
                    // onOrderStatus={() => setShowOrderStatusModal(true)}
                    />

                    {/* Поиск */}
                    <SearchInput
                        // ref={searchInputRef}
                        placeholder="Поиск заказа по номеру"
                    // onSearch={handleSearch}
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
                            onClick={() => handleStatusClick(status.id)}
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
                    centeredColumns={['Номер', 'Дата и время оформления']}  // Cписок центрируемых колонок
                />}
            </div>

            {/* Панель для управления пагинацией */}
            <div>
                {!isLoading && (
                    <PaginationBar
                        totalItems={totalOrders}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

        </div>
    );
}
export default OrdersPage;
