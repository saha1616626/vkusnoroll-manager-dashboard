// Модальное окно для смены статусов оплаты у заказов (массово)

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

// Импорт стилей
import './../../styles/modals/changeOrderPaymentStatusesModal.css';

const ChangeOrderPaymentStatusesModal = ({
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
    const [selectedStatus, setSelectedStatus] = useState(""); // Выбранный статус заказа

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

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    const handleConfirm = () => {
        if (!selectedStatus) return;
        // Преобразуем строку в boolean
        const statusBoolean = selectedStatus === 'true';
        onConfirm(statusBoolean);
        setSelectedStatus("");
    };

    /* 
    ===========================
    Рендер
    ===========================
    */

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="change-order-payment-statuses-modal-overlay">
            <div className="change-order-payment-statuses-modal-container" ref={modalRef}>
                <div className="change-order-payment-statuses-modal-header">
                    <h3>
                        {selectedOrderIds.length === 1
                            ? "Смена статуса оплаты заказа"
                            : "Смена статуса оплаты заказов"
                        }
                    </h3>
                </div>

                <div className="change-order-payment-statuses-modal-body">

                    <div className="change-order-payment-statuses-modal-input-group">
                        <label>Статус заказа</label>
                        <div className="change-order-payment-statuses-modal-select-wrapper">
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="change-order-payment-statuses-modal-status-select"
                            >
                                <option value="">Выберите статус</option>
                                <option value="true">Оплачен</option>
                                <option value="false">Не оплачен</option>
                            </select>
                        </div>
                    </div>

                </div>

                <div className="change-order-payment-statuses-modal-footer">
                    <button className="button-control change-order-payment-statuses-modal-cancel-button" onClick={onCancel}>Отмена</button>
                    <button
                        className="button-control change-order-payment-statuses-modal-confirm-button"
                        onClick={handleConfirm}
                        disabled={!selectedStatus}
                    >
                        Подтвердить
                    </button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
};

export default ChangeOrderPaymentStatusesModal;