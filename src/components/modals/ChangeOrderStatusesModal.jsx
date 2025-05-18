// Модальное окно для смены статусов у заказов (массово)

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

// Импорт компонентов
import api from '../../utils/api';  // API сервера

// Импорт стилей
import './../../styles/modals/changeOrderStatusesModal.css';

const ChangeOrderStatusesModal = ({
    isOpen,
    selectedOrderIds,
    onConfirm,
    onCancel
}) => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const modalRef = useRef(null); // Ссылка на окно
    const [orderStatuses, setOrderStatuses] = useState([]); // Статусы заказов
    const [selectedStatusId, setSelectedStatusId] = useState(""); // Выбранный статус заказа

    /* 
    ===========================
     Эффекты
    ===========================
    */

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

    // Загружаем список статусов заказов
    useEffect(() => {
        if (isOpen) {
            const loadOrderStatuses = async () => {
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
                    console.error('Ошибка загрузки статусов заказов:', error);
                    onCancel(); // Закрываем окно в случае ошибки
                }
            };

            loadOrderStatuses();
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    const handleConfirm = () => {
        if (!selectedStatusId) return;
        onConfirm(selectedStatusId);
        setSelectedStatusId("");
    };

    /* 
    ===========================
    Рендер
    ===========================
    */

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="change-order-statuses-modal-overlay">
            <div className="change-order-statuses-modal-container" ref={modalRef}>
                <div className="change-order-statuses-modal-header">
                    <h3>
                        {selectedOrderIds.length === 1
                            ? "Смена статуса заказа"
                            : "Смена статуса заказов"
                        }
                    </h3>
                </div>

                <div className="change-order-statuses-modal-body">

                    <div className="change-order-statuses-modal-input-group">
                        <label>Статус заказа</label>
                        <div className="change-order-statuses-modal-select-wrapper">
                            <select
                                value={selectedStatusId}
                                onChange={(e) => setSelectedStatusId(e.target.value)}
                                className="change-order-statuses-modal-status-select"
                            >
                                <option value="">Выберите статус</option>
                                {orderStatuses.map(status => (
                                    <option key={status.id} value={status.id}>
                                        {status.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                </div>

                <div className="change-order-statuses-modal-footer">
                    <button className="button-control change-order-statuses-modal-cancel-button" onClick={onCancel}>Отмена</button>
                    <button
                        className="button-control change-order-statuses-modal-confirm-button"
                        onClick={handleConfirm}
                        disabled={!selectedStatusId}
                    >
                        Подтвердить
                    </button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
};

export default ChangeOrderStatusesModal;