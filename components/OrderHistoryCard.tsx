import React, { useState } from 'react';
import type { OrderDetails } from '../types';

interface OrderHistoryCardProps {
  order: OrderDetails;
}

export const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({ order }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const orderDate = new Date(order.date);

    return (
        <div className="bg-gray-900 p-4 rounded-lg transition-all duration-300">
            <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer flex justify-between items-center">
                <div>
                    <p className="font-bold text-white">سفارش #{order.id.slice(-6)}</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {orderDate.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="text-left">
                    <p className="font-semibold text-lg">{order.total.toLocaleString('fa-IR')} تومان</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                       <span className="text-xs px-2 py-1 bg-green-800 text-green-300 rounded-full">{order.status || 'تحویل شده'}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>
            {isExpanded && (
                 <div className="mt-4 pt-4 border-t border-gray-700 animate-fade-in-down space-y-3">
                    <h4 className="font-semibold mb-2 text-base text-gray-200">اقلام سفارش:</h4>
                    <div className="space-y-2 text-sm mb-2">
                        {order.items.map(item => (
                            <div key={item.menuItemId} className="flex justify-between">
                                <span className="text-gray-300">{item.name} <span className="text-green-400 font-mono">x{item.quantity.toLocaleString('fa-IR')}</span></span>
                                <span className="text-gray-200">{(item.priceAtTimeOfOrder * item.quantity).toLocaleString('fa-IR')}</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1 text-base text-gray-200">آدرس تحویل:</h4>
                        <p className="text-sm text-gray-400">{order.deliveryAddress}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1 text-base text-gray-200">شماره تماس:</h4>
                        <p className="text-sm text-gray-400 font-mono">{order.contactPhone}</p>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fade-in-down {
                    0% {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}
