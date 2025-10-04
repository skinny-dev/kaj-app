import React from 'react';
import type { OrderDetails } from '../types';

interface InvoiceProps {
  order: OrderDetails;
}

export const Invoice: React.FC<InvoiceProps> = ({ order }) => {
  const orderDate = new Date(order.date);

  return (
    <div className="bg-white text-black p-8" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">کافه رستوران کاج</h1>
          <p className="text-gray-500">صورتحساب سفارش</p>
        </div>
        <div className="text-left">
          <p><strong>شماره سفارش:</strong> #{order.id.slice(-6)}</p>
          <p><strong>تاریخ:</strong> {orderDate.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <section className="my-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">اطلاعات مشتری:</h2>
        <p><strong className="font-medium text-gray-600">آدرس تحویل:</strong> {order.deliveryAddress}</p>
        <p><strong className="font-medium text-gray-600">شماره تماس:</strong> {order.contactPhone}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">اقلام سفارش:</h2>
        <table className="w-full text-right">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="p-2 font-semibold">نام کالا</th>
              <th className="p-2 font-semibold">تعداد</th>
              <th className="p-2 font-semibold">قیمت واحد</th>
              <th className="p-2 font-semibold text-left">قیمت کل</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.menuItemId} className="border-b border-gray-200">
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.quantity.toLocaleString('fa-IR')}</td>
                <td className="p-2">{item.priceAtTimeOfOrder.toLocaleString('fa-IR')}</td>
                <td className="p-2 text-left">{(item.priceAtTimeOfOrder * item.quantity).toLocaleString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex justify-end">
        <div className="w-full max-w-xs">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">جمع اقلام:</span>
            <span>{order.total.toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">هزینه ارسال:</span>
            <span>رایگان</span>
          </div>
          <div className="flex justify-between py-2 mt-2 border-t-2 border-gray-300 font-bold text-lg">
            <span>مبلغ نهایی:</span>
            <span>{order.total.toLocaleString('fa-IR')} تومان</span>
          </div>
        </div>
      </section>
      
      <footer className="mt-8 pt-4 border-t-2 border-gray-200 text-center text-gray-500">
          <p>از خرید شما سپاسگزاریم!</p>
      </footer>
    </div>
  );
};
