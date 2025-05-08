// Выпадающее меню со списком статусов заказов

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// Импорт компонентов
import api from '../../utils/api'; // API сервера

// Импорт стилей
import "./../../styles/ui/dropdownStatusSelection.css";

// Импорт иконок
import resetIcon from './../../assets/icons/reset.png';

const DropdownStatusSelection = ({ pageId, onStatusChange }) => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const [isOpen, setIsOpen] = useState(false); // Отображение
    const [statuses, setStatuses] = useState([]); // Список статусов
    const [selectedStatuses, setSelectedStatuses] = useState(() => { // Выбранные статусы
        const saved = localStorage.getItem(`statusSettings_${pageId}`);
        return saved ? JSON.parse(saved) : []; // Пустой массив по умолчанию
    });
    const dropdownRef = useRef(null); // Сслыка на контейнер элемента

    // Загрузка статусов из БД
    useEffect(() => {
        const loadStatuses = async () => {
            try {
                const response = await api.getOrderStatuses();
                const dbStatuses = response.data;

                // Добавляем системные статусы
                const systemStatuses = [
                    { id: 'all', name: 'Все', sequenceNumber: -2 },
                    { id: 'new', name: 'Новый', sequenceNumber: -1 }
                ];

                const allStatuses = [...systemStatuses, ...dbStatuses]
                    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

                setStatuses(allStatuses);

                // Восстановление выбранных статусов после загрузки
                setSelectedStatuses(prev =>
                    prev.map(p =>
                        allStatuses.find(s => s.id === p.id) || p
                    )
                );
            } catch (error) {
                console.error('Ошибка загрузки статусов:', error);
            }
        };
        loadStatuses();
    }, []);

    // Сохранение состояния
    useEffect(() => {
        localStorage.setItem(`statusSettings_${pageId}`, JSON.stringify(selectedStatuses));
        onStatusChange(selectedStatuses);
    }, [selectedStatuses, pageId, onStatusChange]);

    // Обработчик выбора статуса
    const handleStatusToggle = (status) => {
        setSelectedStatuses(prev => {
            // Удаляем статус, если он уже выбран, иначе добавляем
            const newSelection = prev.some(s => s.id === status.id)
                ? prev.filter(s => s.id !== status.id)
                : [...prev, status];

            // Если ничего не выбрано - возвращаем пустой массив
            return newSelection;
        });
    };

    // Сброс всех статусов
    const handleReset = () => {
        setSelectedStatuses([]); // Полностью очищаем выбор
        localStorage.removeItem(`statusSettings_${pageId}`);
    };

    // Закрытие при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="dropdown-status-container" ref={dropdownRef}>
            <button
                className="button-control"
                onClick={() => setIsOpen(!isOpen)}
            >
                Статусы
            </button>

            {isOpen && (
                <div className="dropdown-status-menu">
                    <div className="dropdown-status-header">
                        <h4>Настроить статусы</h4>
                        <button
                            className="dropdown-status-reset"
                            onClick={handleReset}
                        >
                            <img src={resetIcon} alt="Reset" className="dropdown-status-reset-icon" />
                            Сбросить
                        </button>
                    </div>

                    <hr className="dropdown-status-divider" /> {/* Разделительная линия */}

                    <div className="dropdown-status-items">
                        {statuses.map(status => (
                            <label key={status.id} className="dropdown-status-item">

                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.some(s => s.id === status.id)}
                                    onChange={() => handleStatusToggle(status)}
                                />
                                {status.name}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

DropdownStatusSelection.propTypes = {
    pageId: PropTypes.string.isRequired,
    onStatusChange: PropTypes.func.isRequired
};

export default DropdownStatusSelection;