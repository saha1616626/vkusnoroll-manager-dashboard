// Модальное окно для управления датой и временем доставки в заказе

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

// Импорт компонентов

// Импорт стилей
import './../../styles/modals/deliveryTimeOrderModal.css'

// Импорт иконок
import crossIcon from './../../assets/icons/cross.png'; // Крестик

const DeliveryTimeOrderModal = ({
    isOpen,
    onCancel,
    deliverySchedule,
    currentServerTime,
    deliveryInterval,
    onSelect,
    refreshKey
}) => {

    /* 
    ================================
     Состояния, константы и ссылки
    ================================
    */

    const modalRef = useRef(null); // Ссылка на текущее модальное окно
    const [selectedDate, setSelectedDate] = useState(''); // Дата доставки
    const [selectedTime, setSelectedTime] = useState(''); // Время доставки

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // При открытии окна передается перечень рабочих дней с указанием времени доставки
    useEffect(() => {
        if (isOpen && deliverySchedule.length > 0) {
            setSelectedDate(deliverySchedule.find(d => d.isWorking)?.date || '');
        }

        // Убираем скролл с перекрытой страницы
        if (isOpen) {
            document.body.classList.add('no-scroll');
            return () => document.body.classList.remove('no-scroll');
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps 

    // Эффект сброса времени при смене даты
    useEffect(() => {
        setSelectedTime('');
    }, [selectedDate]);

    // Закрываем модальное окно при клике на фон
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isOpen &&
                modalRef.current &&
                !modalRef.current.contains(event.target)
            ) {
                onCancel(); // Закрываем меню
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps 

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Генерация всех временных интервалов доставки
    const generateTimeSlots = (start, end, interval) => {
        const slots = [];
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);

        let current = new Date(startTime);
        while (current < endTime) {
            const from = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
            const next = new Date(current.getTime() + interval * 60000);
            if (next > endTime) break;
            const to = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
            slots.push(`${from} — ${to}`);
            current = next;
        }
        return slots;
    };

    // Фильтрация слотов исходя из текущего времени
    const generateFilteredSlots = useCallback((selectedDay) => {
        let slots = generateTimeSlots(
            selectedDay.start,
            selectedDay.end,
            deliveryInterval  // Используем актуальный интервал из пропсов
        );

        if (currentServerTime &&
            selectedDay.date === currentServerTime.toISOString().split('T')[0]
        ) {
            const now = currentServerTime.getHours() * 60 + currentServerTime.getMinutes();
            slots = slots.filter(slot => {
                const [from] = slot.split(' — ');
                const [hours, minutes] = from.split(':').map(Number);
                return (hours * 60 + minutes) > now + 60;
            });
        }

        return slots;
    }, [deliveryInterval, currentServerTime]);

    // Сохранение выбранного времени и даты
    const handleConfirm = () => {
        if (selectedDate && selectedTime) {
            onSelect(selectedDate, selectedTime);
            onCancel();
        }
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return isOpen && ReactDOM.createPortal(
        <div className="delivery-time-order-modal-overlay active">
            <div className="delivery-time-order-modal-container" ref={modalRef}>
                <button className="delivery-time-order-modal-close-button" onClick={onCancel}>
                    <img src={crossIcon} alt="Cross" />
                </button>

                <h2 className="delivery-time-order-modal-title">Выберите дату и время доставки</h2>

                <div className="delivery-time-order-modal-content">
                    <div className="delivery-time-order-modal-calendar">
                        {deliverySchedule.map(day => (
                            <button
                                key={day.date}
                                className={`delivery-time-order-modal-day ${!day.isWorking ? 'disabled' : ''} ${selectedDate === day.date ? 'selected' : ''}`}
                                onClick={() => day.isWorking && setSelectedDate(day.date)}
                                disabled={!day.isWorking}
                            >
                                <div>{new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}</div>
                                <div>{new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric' })}</div>
                                <div
                                    style={{
                                        marginTop: '5px',
                                        paddingTop: '2px',
                                        borderBottomWidth: '100px',
                                        borderTop: '1px solid black',
                                        borderWidth: '0.5px',
                                        display: 'inline-block',
                                        padding: '0 0'
                                    }}
                                >
                                    {day.isWorking ? `${day.start}-${day.end}` : 'Закрыто'}</div>
                            </button>
                        ))}
                    </div>

                    <div className="delivery-time-order-modal-time-slots">
                        {selectedDate && deliverySchedule
                            .find(d => d.date === selectedDate)
                            ?.isWorking && (() => {
                                const selectedDay = deliverySchedule.find(d => d.date === selectedDate);
                                const slots = generateFilteredSlots(selectedDay);

                                return slots.length > 0 ? (
                                    slots.map((time, index) => (
                                        <button
                                            key={index}
                                            className={`delivery-time-order-modal-slot ${selectedTime === time ? 'selected' : ''}`}
                                            onClick={() => setSelectedTime(time)}
                                        >
                                            {time}
                                        </button>
                                    ))
                                ) : (
                                    <div className="delivery-time-order-modal-no-slots">
                                        Доставка на выбранную дату недоступна
                                    </div>
                                );
                            })()}
                    </div>
                </div>

                <button
                    className="delivery-time-order-modal-confirm-btn"
                    onClick={handleConfirm}
                    disabled={!selectedTime}
                >
                    Подтвердить
                </button>
            </div>
        </div>,
        document.body
    );
}
export default DeliveryTimeOrderModal;
