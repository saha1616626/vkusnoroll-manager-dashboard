// Страница для редактирования или добавления нового заказа

import React from 'react';
import { useNavigate, useParams } from "react-router-dom";

// Импорт компонентов

// Импорт иконок

// Импорт стилей
import './../../styles/pages/addEditOrderPage.css'


const AddEditOrderPage = ({ mode }) => {

    /* 
    ===============================
    Состояния, константы и ссылки
    ===============================
    */

    const navigate = useNavigate();


    /* 
    ===========================
     Эффекты
    ===========================
    */

    const { id } = useParams(); // Переданный id пользователя в URL запроса

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Обработчик закрытия страницы
    const handleClosePage = () => { // Функция принимает аргумент forceClose, по умолчанию равный false. Аргумент позволяет при необходимости принудительно закрыть окно или перейти на другую страницу, минуя любые проверки
        // if (isDirty) { // Если есть несохраненные изменения
        //     // Показываем модальное окно вместо confirm
        //     setPendingNavigation(() => () => {
        //         navigate('/settings/employees', { replace: true });
        //     });
        //     setShowNavigationConfirmModal(true);
        //     return;
        // }
        navigate('/orders', { replace: true }); // Возврат пользователя на предыдущую страницу с удалением маршрута
    };


    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="add-edit-order-container">
            {/* Шапка страницы */}
            <div className="add-edit-order-header">
                <h1 className="add-edit-order-title">
                    {mode === 'add' ? 'Новый заказ' : `Заказ VR-${id}`}
                </h1>

                <div className="add-edit-order-header-controls">
                    <button className="button-control add-edit-order-close-btn" onClick={handleClosePage}>Закрыть</button>
                    <button className="button-control add-edit-order-save-btn">Сохранить</button>
                </div>
            </div>

            {/* Основной контент */}
            <div className="add-edit-order-content">
                {/* Левая колонка */}
                <div className="add-edit-order-main-section">
                    {/* Блок получателя */}
                    <section className="add-edit-order-section">
                        <h2 className="add-edit-order-subtitle">Данные получателя</h2>
                        <div className="add-edit-order-form-group">
                            <div className="add-edit-order-input-group">
                                <label>Имя</label>
                                <input type="text" className="add-edit-order-input" />
                            </div>

                            <div className="add-edit-order-input-group">
                                <label>Телефон</label>
                                {/* <IMaskInput mask="+7(000)000-00-00" /> */}
                            </div>

                            <div className="add-edit-order-input-group">
                                <label>Комментарий клиента</label>
                                <textarea className="add-edit-order-textarea" />
                            </div>
                        </div>
                    </section>

                    {/* Статус и оплата */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-status-group">
                            <div className="add-edit-order-input-group">
                                <label>Статус заказа</label>
                                <select>
                                    <option>Новый</option>
                                    <option>В обработке</option>
                                    <option>Выполнен</option>
                                </select>
                            </div>

                            <div className="add-edit-order-input-group">
                                <label>Оплачен</label>
                                <input type="checkbox" />
                            </div>
                        </div>
                    </section>

                    {/* Способ оплаты */}
                    <section className="add-edit-order-section">
                        <h2 className="add-edit-order-subtitle">Способ оплаты</h2>
                        <div className="add-edit-order-payment-methods">
                            {['Наличные', 'Картой', 'Онлайн'].map(method => (
                                <label key={method}>
                                    <input type="radio" name="payment" />
                                    {method}
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Комментарий менеджера */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-input-group">
                            <label>Комментарий менеджера</label>
                            <textarea className="add-edit-order-textarea" />
                        </div>
                    </section>

                    {/* Блок доставки */}
                    <section className="add-edit-order-section">
                        <h2 className="add-edit-order-subtitle">Доставка</h2>
                        <div className="add-edit-order-map-container">
                            {/* Здесь будет компонент карты */}
                            <div className="add-edit-order-map-placeholder" />

                            <div className="add-edit-order-address-fields">
                                {/* Поля адреса как в AddressModal */}
                                <div className="add-edit-order-input-group">
                                    <label>Город</label>
                                    <input type="text" />
                                </div>

                                {/* Остальные поля адреса... */}
                            </div>
                        </div>

                        <div className="add-edit-order-delivery-price">
                            <input type="number" placeholder="Стоимость доставки" className="add-edit-order-input" />
                            <button>Рассчитать автоматически</button>
                        </div>
                    </section>

                    {/* Время доставки */}
                    <section className="add-edit-order-section">
                        <button className="add-edit-order-time-btn">
                            Выбрать время доставки
                        </button>
                    </section>

                    {/* Товары */}
                    <section className="add-edit-order-section">
                        <div className="add-edit-order-products-header">
                            <h3 className="add-edit-order-subtitle">Товары в заказе</h3>
                            <button>Добавить товар</button>
                        </div>

                        <table className="add-edit-order-products-table">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Количество</th>
                                    <th>Цена</th>
                                    <th>Сумма</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Строки товаров */}
                            </tbody>
                        </table>
                    </section>
                </div>

                {/* Правая колонка - суммарная информация */}
                <div className="add-edit-order-sidebar">
                    <section className="add-edit-order-summary-section">
                        <h2 className="add-edit-order-subtitle">Итоговая информация</h2>

                        <div className="add-edit-order-summary-row">
                            <span>Сумма товаров:</span>
                            <span>0 ₽</span>
                        </div>

                        <div className="add-edit-order-summary-row">
                            <span>Доставка:</span>
                            <span>0 ₽</span>
                        </div>

                        <div className="add-edit-order-summary-total">
                            <span>Итого:</span>
                            <span>0 ₽</span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AddEditOrderPage;
