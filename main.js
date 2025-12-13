/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const { sale_price, quantity } = purchase;
    const discount = 1 - purchase.discount / 100;
    return sale_price * quantity * discount
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;
    if (index == 0)
        return 0.15*profit;
    
    if (index >= 1 && index <= 2)
        return 0.10*profit;
    
    if (index < total - 1)
        return 0.05 * profit;

    return 0
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    //#region Валидация входных данных
    if (!data)
        throw new Error("Нет данных для анализа");

    if (!data.customers || !Array.isArray(data.customers) || data.customers.length === 0)
        throw new Error("Нет данных о покупателях");

    if (!data.sellers || !Array.isArray(data.sellers) || data.sellers.length === 0)
        throw new Error("Нет данных о продавцах");

    if (!data.products || !Array.isArray(data.products) || data.products.length === 0)
        throw new Error("Нет данных о товарах");

    if (!data.purchase_records || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0)
        throw new Error("Нет данных о покупках");
//#endregion

    // @TODO: Проверка наличия опций
    if (!options && typeof options !== 'object')
        throw new Error("Нет опций для анализа");

    const { calculateRevenue, calculateBonus } = options; 

    if (typeof calculateRevenue !== 'function')
        throw new Error("Опция calculateRevenue должна быть функцией");
    
    if (typeof calculateBonus !== 'function')
        throw new Error("Опция calculateBonus должна быть функцией");

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: seller.first_name + ' ' + seller.last_name,
        sales_count: 0,
        revenue: 0,
        profit: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((sellerIndex, seller) => {
        sellerIndex[seller.seller_id] = seller;
        return sellerIndex;
    }, {});

    const productsIndex = data.products.reduce((productsIndex, product) => {
        productsIndex[product.sku] = product;
        return productsIndex;
    }, {});

    
    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(purchase => {
        const seller = sellerIndex[purchase.seller_id];
        seller.sales_count += 1;
        purchase.items.forEach(item => {
            const product = productsIndex[item.sku];
            if (seller && product) {
                
                const revenue = calculateRevenue(item, product);
                const profit = revenue - (product.purchase_price * item.quantity);

                seller.revenue += revenue;
                seller.profit += profit;
                
                if (!seller.products_sold[product.sku]) {
                    seller.products_sold[product.sku] = {
                        product_name: product.name,
                        quantity_sold: 0
                    };
                }
                seller.products_sold[product.sku].quantity_sold += item.quantity;
            }
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);
    sellerStats.forEach((seller, index, arr) => {
        seller.bonus = calculateBonus(index, arr.length, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, value]) => ({
                sku,
                quantity: (value && typeof value === 'object' && 'quantity_sold' in value) ? value.quantity_sold : value
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        delete seller.products_sold;
    });


    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id, // Строка, идентификатор продавца
        name: seller.name,// Строка, имя продавца
        revenue: +seller.revenue.toFixed(2),// Число с двумя знаками после точки, выручка продавца
        profit: +seller.profit.toFixed(2),// Число с двумя знаками после точки, прибыль продавца
        sales_count: seller.sales_count,// Целое число, количество продаж продавца
        top_products: seller.top_products,// Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
        bonus: +seller.bonus.toFixed(2) // Число с двумя знаками после точки, бонус продавца
})); ;
}
