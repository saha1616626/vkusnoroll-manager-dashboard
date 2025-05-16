// Модальное окно вывода ошибки ввода при сохранении данных

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './../../styles/modals/validationErrorMessageModal.css';

const ValidationErrorMessageModal = ({ errors, onClose, isOpen }) => {

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

    // Обработчик нажатия на Escape
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') onClose(); // Закрыть окно при нажатии кнопки "Escape"
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onClose]);

    // Обработчик клика вне модального окна
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose(); // Закрываем окно
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

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
        <div className="validation-error-message-modal-overlay">
            <div className="validation-error-message-modal-container" ref={modalRef}>
                <div className="validation-error-message-modal-header">
                    <h3>Ошибки заполнения</h3>
                    <button className="validation-error-message-modal-close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="validation-error-message-modal-content">
                    <p>Пожалуйста, заполните все обязательные поля:</p>
                    <ul>
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>

                <div className="validation-error-message-modal-footer">
                    <button className="button-control validation-error-message-modal-confirm-button" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
}

export default ValidationErrorMessageModal;