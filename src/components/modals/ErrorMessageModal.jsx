// Модальное окно для вывода ошибок

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './../../styles/modals/errorMessageModal.css';

// Свойства для переиспользования в родительском компоненте
// Модальное окно для отображения любых ошибок с кастомным заголовком
// const [errorMessages, setErrorMessages] = useState([]); // Ошибки
// const [showErrorMessageModal, setShowErrorMessageModal] = useState(false); // Отображение 
// const [titleErrorMessageModal, setTitleErrorMessageModal] = useState('Ошибка'); // Заголвок окна

const ErrorMessageModal = ({
    isOpen,
    title = "Ошибка",
    errors = [],
    onClose
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
        <div className="error-message-modal-overlay">
            <div className="error-message-modal-container" ref={modalRef}>
                <div className="error-message-modal-header">
                    <h3>{title}</h3>
                    <button className="error-message-modal-close-icon" onClick={onClose}>&times;</button>
                </div>

                <div className="error-message-modal-body">
                    {errors.length > 0 && (
                        <ul className="error-message-modal-list">
                            {errors.map((error, index) => (
                                <li key={index} className="error-message-modal-item">
                                    {error}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="error-message-modal-footer">
                    <button
                        className="button-control error-message-modal-close-button"
                        onClick={onClose}
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );
};

export default ErrorMessageModal;