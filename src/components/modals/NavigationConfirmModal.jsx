// Модальное окно подтверждения ухода со страницы при наличии несохраненных данных
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

import './../../styles/modals/navigationConfirmModal.css';

const NavigationConfirmModal = ({
    isOpen,
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
        <div className="navigation-confirm-modal-overlay">
            <div className="navigation-confirm-modal-container" ref={modalRef}>
                <div className="navigation-confirm-modal-header">
                    <h3>Несохранённые изменения</h3>
                </div>

                <div className="navigation-confirm-modal-body">
                    <p>У вас есть несохранённые изменения. Вы уверены, что хотите уйти?</p>
                </div>

                <div className="navigation-confirm-modal-footer">
                    <button className="navigation-confirm-modal-confirm-button button-control" onClick={onConfirm}>
                        Уйти
                    </button>
                    <button className="navigation-confirm-modal-cancel-button button-control" onClick={onCancel}>
                        Остаться
                    </button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
};

export default NavigationConfirmModal;
