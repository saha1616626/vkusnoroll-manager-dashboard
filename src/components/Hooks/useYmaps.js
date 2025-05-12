// Кастомный хук для использования Яндекс карты

import { useState, useEffect } from 'react';

let ymapsLoadingPromise = null; // Поддержка нескольких экземпляров

export const useYmaps = () => {
    const [ymaps, setYmaps] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const loadYmaps = async () => {

            // Если скрипт уже загружен, возвращаем ymaps
            if (window.ymaps) {
                await window.ymaps.ready();
                return window.ymaps;
            }

            if (!ymapsLoadingPromise) {
                ymapsLoadingPromise = new Promise((resolve, reject) => {
                    const API_KEY = process.env.REACT_APP_YANDEX_MAPS_API_KEY;
                    const script = document.createElement('script');
                    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`;

                    // Обработка успешной загрузки
                    script.onload = () => {
                        window.ymaps.ready(() => resolve(window.ymaps));
                    };

                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            return ymapsLoadingPromise;
        };

        loadYmaps()
            .then(ymapsInst => {
                setYmaps(ymapsInst);
                setIsReady(true);
            }) 
            // Обработка ошибок
            .catch(error => {
                console.error('Yandex Maps load error:', error);
            });
    }, []);

    return { ymaps, isReady };
};