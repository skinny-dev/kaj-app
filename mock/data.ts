import type { MenuItem, User, OrderDetails } from '../types';

export const mockMenuItems: MenuItem[] = [
  // Kebabs
  {
    id: 1,
    name: 'کباب کوبیده',
    description: 'دو سیخ کباب کوبیده گوشت مخلوط گوسفند و گوساله',
    price: 150000,
    category: 'کباب‌ها',
    imageUrl: 'https://picsum.photos/seed/kebab1/200/200',
  },
  {
    id: 2,
    name: 'جوجه کباب',
    description: 'یک سیخ جوجه کباب زعفرانی همراه با گوجه کبابی',
    price: 140000,
    category: 'کباب‌ها',
    imageUrl: 'https://picsum.photos/seed/kebab2/200/200',
  },
  {
    id: 3,
    name: 'کباب برگ',
    description: 'یک سیخ کباب برگ مخصوص تهیه شده از راسته گوسفندی',
    price: 250000,
    category: 'کباب‌ها',
    imageUrl: 'https://picsum.photos/seed/kebab3/200/200',
  },
  // Appetizers
  {
    id: 4,
    name: 'سوپ جو',
    description: 'سوپ جو کِرِمی با قارچ و مرغ',
    price: 60000,
    category: 'پیش‌غذا',
    imageUrl: 'https://picsum.photos/seed/appetizer1/200/200',
  },
  {
    id: 5,
    name: 'سالاد سزار',
    description: 'کاهو، نان تست، سس سزار مخصوص و مرغ گریل شده',
    price: 120000,
    category: 'پیش‌غذا',
    imageUrl: 'https://picsum.photos/seed/appetizer2/200/200',
  },
  // Drinks
  {
    id: 6,
    name: 'نوشابه',
    description: 'نوشابه قوطی کوکاکولا، پپسی، فانتا',
    price: 20000,
    category: 'نوشیدنی‌ها',
    imageUrl: 'https://picsum.photos/seed/drink1/200/200',
  },
  {
    id: 7,
    name: 'دوغ',
    description: 'دوغ محلی لیوانی',
    price: 25000,
    category: 'نوشیدنی‌ها',
    imageUrl: 'https://picsum.photos/seed/drink2/200/200',
  },
  {
    id: 8,
    name: 'آب معدنی',
    description: 'آب معدنی کوچک',
    price: 10000,
    category: 'نوشیدنی‌ها',
    imageUrl: 'https://picsum.photos/seed/drink3/200/200',
  },
];


export const mockOrderHistory: OrderDetails[] = [
    {
        id: 'order-abc',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
            { menuItemId: 1, name: 'کباب کوبیده', quantity: 2, priceAtTimeOfOrder: 150000 },
            { menuItemId: 6, name: 'نوشابه', quantity: 2, priceAtTimeOfOrder: 20000 },
        ],
        total: 340000,
        deliveryAddress: 'تهران، خیابان ولیعصر، نرسیده به میدان تجریش، پلاک ۳۰۰',
        contactPhone: '09123456789',
        notes: 'نوشابه کوکاکولا باشد.',
        status: 'تحویل شده'
    },
    {
        id: 'order-def',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
            { menuItemId: 2, name: 'جوجه کباب', quantity: 1, priceAtTimeOfOrder: 140000 },
        ],
        total: 140000,
        deliveryAddress: 'تهران، سعادت آباد، میدان کاج',
        contactPhone: '09123456789',
        notes: '',
        status: 'تحویل شده'
    }
];
