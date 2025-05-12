//  Модальное окно подтверждения действия

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './../../styles/modals/confirmationModal.css';

const ConfirmationModal = ({
    isOpen,
    title = "Подтверждение действия",
    message = "Вы уверены, что хотите выполнить это действие?",
    onConfirm,
    onCancel
}) => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const modalRef = useRef(null); // Ссылка на окно

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
    Рендер
    ===========================
    */

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="confirmation-modal-overlay">
            <div className="confirmation-modal-container" ref={modalRef}>
                <div className="confirmation-modal-header">
                    <h3>{title}</h3>
                </div>

                <div className="confirmation-modal-body">
                    <p>{message}</p>
                </div>

                <div className="confirmation-modal-footer">
                    <button className="button-control confirmation-modal-confirm-button" onClick={onConfirm}>Да</button>
                    <button className="button-control confirmation-modal-cancel-button" onClick={onCancel}>Отмена</button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
};

export default ConfirmationModal;