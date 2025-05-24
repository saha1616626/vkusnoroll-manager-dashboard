// Страница восстановления пароля

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Компоненты
import api from '../../../utils/api'; // API сервера

// Импорт стилей
import "./../../../styles/pages/auth/passwordRecoveryPage.css";

// Импорт иконок
import eyeIcon from './../../../assets/icons/eye.png'
import hiddenEyeIcon from './../../../assets/icons/hiddenEye.png'

const PasswordRecoveryPage = () => {

    /* 
    ===============================
     Состояния, константы и ссылки
    ===============================
    */

    const navigate = useNavigate(); // Навигация

    const [email, setEmail] = useState(''); // Почта
    const [password, setPassword] = useState(''); // Пароль
    const [confirmPassword, setConfirmPassword] = useState(''); // Повтор пароля
    const [message, setMessage] = useState({
        text: '',
        type: 'error' // 'error' | 'success' 
    });
    const [showPassword, setShowPassword] = useState(true); // Отображение пароля
    const [showConfirmPassword, setShowConfirmPassword] = useState(true);

    const [isTimerActive, setIsTimerActive] = useState(false); // Работа таймера при отправке кода подтверждения
    const [timer, setTimer] = useState(60); // Таймер
    const [lastCodeSentTime, setLastCodeSentTime] = useState(null); // Последнее время генерации кода
    const [confirmationCode, setConfirmationCode] = useState(''); // Код подтверждения
    const [userId, setUserId] = useState(null); // Пользователь, которому необходимо подтвердить почту
    const [isConfirmationCodeInputMode, setIsConfirmationCodeInputMode] = useState(false); // Режим ввода кода подтверждения
    const [isNewPasswordEntryMode, setIsNewPasswordEntryMode] = useState(false); // Режим ввода нового пароля

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Скрыть сообщение через несколько секунд
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage(prev => ({ ...prev, fading: true }));

                // Удаляем сообщение после завершения анимации
                setTimeout(() => {
                    setMessage({ text: '', type: 'error', fading: false });
                }, 300); // Должно совпадать с временем анимации
            }, 3000); // Общее время показа сообщения

            return () => clearTimeout(timer);
        }
    }, [message.text]);

    // Эффект для таймера кода подтверждения
    useEffect(() => {
        let interval;
        if (isTimerActive && lastCodeSentTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const timePassed = now - lastCodeSentTime;
                const remaining = Math.ceil((60 * 1000 - timePassed) / 1000);

                if (remaining > 0) {
                    setTimer(remaining);
                } else {
                    setIsTimerActive(false);
                    setTimer(60);
                    clearInterval(interval);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerActive, lastCodeSentTime]);


    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Валидация Email
    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    // Валидация Пароля
    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('');
        if (!/[A-Za-z]/.test(password)) errors.push('');
        if (!/[0-9]/.test(password)) errors.push('');
        if (!/[!@#$%^&*]/.test(password)) errors.push('');
        if (/[\u0400-\u04FF]/.test(password)) errors.push(''); // Проверка на кириллицу
        return errors;
    };

    // Главная кнопка формы
    const handleSubmit = async (e) => {
        e.preventDefault(); // Отменяет действие события по умолчанию
        try {
            if (isNewPasswordEntryMode) {
                if (password !== confirmPassword) {
                    setMessage({
                        text: 'Пароли не совпадают',
                        type: 'error'
                    });
                    return;
                }

                // Валидация пароля
                const passwordErrors = validatePassword(password);
                if (passwordErrors.length > 0) {
                    setMessage({
                        text: 'Пароль должен состоять минимум из 8 символов. В нем должны быть цифры, буквы и спецсимволы. Кириллица не допускается.',
                        type: 'error'
                    });
                    return;
                }

                // Метод смены пароля
                const responseChangingPassword = await api.changingPassword(userId, password);
                if (responseChangingPassword.data.success) {
                    setMessage({
                        text: 'Пароль успешно сменен! Войдите в аккаунт',
                        type: 'success'
                    });

                    setTimeout(() => {
                        navigate('/login', { replace: true });
                    }, 1000)
                }

                return;
            }

            // Валидация Email
            if (!validateEmail(email)) {
                setMessage({
                    text: 'Неверный формат Email',
                    type: 'error'
                });
                return;
            }

            const responseSendСonfirmationСode = await api.sendCodeManagerRecoveryPassword(email);

            if (responseSendСonfirmationСode.data.success) {
                // Получаем серверное время генерации кода
                const serverTime = new Date(responseSendСonfirmationСode.data.dateTimeСodeCreation).getTime();

                setTimer(60); // Сбрасываем таймер на полную минуту
                setIsTimerActive(true);
                setIsConfirmationCodeInputMode(true); // Режим ввода кода подтверждения
                setUserId(responseSendСonfirmationСode.data.userId);
                setLastCodeSentTime(serverTime);

                // Сохраняем в sessionStorage
                sessionStorage.setItem('lastCodeSentTime', serverTime.toString());
            }

            return;

        } catch (err) {
            setMessage({
                text: err.response?.data?.error,
                type: 'error'
            }); // Вывод ошибки

            // Обновляем таймер, если код для восстановления пароля был запрошен менее минуты назад
            if (err.response?.data?.dateTimeСodeCreation && err.response?.data?.userId && !isNewPasswordEntryMode) {
                const serverTime = new Date(err.response?.data?.dateTimeСodeCreation).getTime();
                setLastCodeSentTime(serverTime);
                setUserId(err.response?.data?.userId);

                // Рассчитываем оставшееся время до возможности запроса нового кода для подтверждения Email
                const now = Date.now();
                const timeDiff = now - serverTime;
                const remaining = Math.ceil((60 * 1000 - timeDiff) / 1000);

                if (remaining > 0) {
                    setTimer(remaining);
                    setIsTimerActive(true);
                    setIsConfirmationCodeInputMode(true); // Режим ввода кода подтверждения
                    return;
                }
            }
        }
    };

    // Обработчик отправки кода подтверждения
    const handleSendConfirmationCode = async () => {
        try {
            if (!userId) { // Если не получен ID пользователя, которому необходимо подтвердить почту, то откатываемся до начальной формы
                setIsConfirmationCodeInputMode(false); // Режим ввода кода подтверждения выкл
                navigate('/login', { replace: true });
                return;
            }

            const responseAccount = await api.getAccountById(userId);

            // Сохраняем время последней генерации кода из серверных данных
            if (responseAccount.data.dateTimeСodeCreation) {
                const serverTime = new Date(responseAccount.data.dateTimeСodeCreation).getTime();
                setLastCodeSentTime(serverTime);

                // Рассчитываем оставшееся время до возможности запроса нового кода для подтверждения Email
                const now = Date.now();
                const timeDiff = now - serverTime;
                const remaining = Math.ceil((60 * 1000 - timeDiff) / 1000);

                if (remaining > 0) {
                    setTimer(remaining);
                    setIsTimerActive(true);
                    setIsConfirmationCodeInputMode(true); // Режим ввода кода подтверждения
                    setMessage({
                        text: 'Последний код был отправлен менее минуты назад. Подождите, чтобы запросить его снова',
                        type: 'error'
                    });
                    return;
                }
            }

            const responseSendConfirmationCode = await api.sendCodeManagerRecoveryPassword(email);

            if (responseSendConfirmationCode.data.success) {
                // Получаем серверное время генерации кода
                const serverTime = new Date(responseSendConfirmationCode.data.dateTimeСodeCreation).getTime();

                setTimer(60); // Сбрасываем таймер на полную минуту
                setIsTimerActive(true);
                setIsConfirmationCodeInputMode(true); // Режим ввода кода подтверждения
                setUserId(responseSendConfirmationCode.data.userId);
                setLastCodeSentTime(serverTime);

                // Сохраняем в sessionStorage
                sessionStorage.setItem('lastCodeSentTime', serverTime.toString());
            }
        } catch (error) {
            setMessage({
                text: 'Ошибка отправки кода подтверждения',
                type: 'error'
            });
        }
    }

    // Обработчик проверки кода
    const handleVerifyCode = async () => {
        try {
            if (!userId) { // Если не получен ID пользователя, которому необходимо подтвердить почту, то откатываемся до начальной формы
                setIsConfirmationCodeInputMode(false); // Режим ввода кода подтверждения выкл
                navigate('/login', { replace: true });
                return;
            }

            if (!confirmationCode || confirmationCode === '') return; // Проверяем отсутствие значения

            const response = await api.checkingCodeResettingPassword(userId, confirmationCode.toString());  // Преобразуем код в строку

            // Успешнавя обработка кода для восстановления пароля
            if (response.data.success) {
                setIsConfirmationCodeInputMode(false); // Режим ввода кода подтверждения выкл
                setIsNewPasswordEntryMode(true); // Режим ввода нового пароля
                // Очистка полей
                setPassword('');
                setConfirmPassword('');
            }
        } catch (error) {
            setMessage({
                text: 'Неверный код или срок действия истек',
                type: 'error'
            });
        }
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="password-recovery-page-container">
            <h1 className="password-recovery-page-logo">ВкусноРолл.Менеджер</h1>
            <div className="password-recovery-page-form-container">
                <form onSubmit={handleSubmit} className="password-recovery-page-form">
                    <h2>Восстановление доступа</h2>

                    {message.text && (
                        <div className={`
                            password-recovery-page-form-message 
                            ${message.type} 
                            ${message.fading ? 'fade-out' : ''}
                        `}>
                            {message.text}
                        </div>
                    )}

                    <div className={`${(isConfirmationCodeInputMode) ? 'password-recovery-page-input-email-group-container' : ''}`}
                        style={{
                            display: isNewPasswordEntryMode ? 'none' : ''
                        }}
                    >
                        <div className="password-recovery-page-input-group">
                            <label htmlFor="email">Почта</label>
                            <input
                                id="email"
                                maxLength={30}
                                type="text"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isConfirmationCodeInputMode ? true : false}
                                style={{ opacity: isConfirmationCodeInputMode ? '0.5' : '' }}
                            />
                        </div>

                        {/* Кнопка выслать код или таймер */}
                        {isConfirmationCodeInputMode && <button
                            type="button"
                            className="button-control password-recovery-page-input-group-button-confirm"
                            onClick={handleSendConfirmationCode}
                            disabled={isTimerActive}
                        >
                            {isTimerActive ? `${timer} сек` : 'Выслать код'}
                        </button>}
                    </div>

                    {/* Поле ввода кода подтверждения */}
                    {isConfirmationCodeInputMode && (
                        <div className="password-recovery-page-confirmation-code-group-container">
                            <div className="password-recovery-page-input-group">
                                <input
                                    placeholder="Введите код"
                                    type="number"
                                    value={confirmationCode}
                                    onChange={(e) => setConfirmationCode(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="button-control password-recovery-page-input-group-button-verify"
                                onClick={handleVerifyCode}
                            >
                                Подтвердить
                            </button>
                        </div>
                    )}

                    {isNewPasswordEntryMode && <>
                        <div className="password-recovery-page-input-group" style={{ marginTop: '25px' }}>
                            <label htmlFor="password">Пароль</label>
                            <div className="password-recovery-page-password-wrapper">
                                <input
                                    id="password"
                                    type={!showPassword ? 'text' : 'password'}
                                    maxLength={100}
                                    placeholder="Новый пароль"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-recovery-page-toggle-password"
                                    onClick={() => setShowPassword(!showConfirmPassword)}
                                >
                                    <img src={showPassword ? hiddenEyeIcon : eyeIcon} alt="Eye" className="icon-button" />
                                </button>
                            </div>
                        </div>

                        <div className="password-recovery-page-input-group" style={{ marginTop: '25px' }}>
                            <label htmlFor="password">Пароль</label>
                            <div className="password-recovery-page-password-wrapper">
                                <input
                                    id="password"
                                    type={!showConfirmPassword ? 'text' : 'password'}
                                    maxLength={100}
                                    placeholder="Повтор нового пароля"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-recovery-page-toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <img src={showConfirmPassword ? hiddenEyeIcon : eyeIcon} alt="Eye" className="icon-button" />
                                </button>
                            </div>
                        </div>
                    </>}

                    <button type="submit" className="password-recovery-page-button"
                        style={{ display: isConfirmationCodeInputMode ? 'none' : '' }}>
                        {isNewPasswordEntryMode ? 'Сохранить' : 'Продолжить'}
                    </button>
                    <a href="/login" className="password-recovery-page-back">Назад к входу</a>
                </form>
            </div>
        </div>
    );
};

export default PasswordRecoveryPage;