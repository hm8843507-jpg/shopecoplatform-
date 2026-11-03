export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  category: string;
  color: string;
  sizes: string[];
  image: string;
  description: string;
  stock?: number;
  brand?: string;
  createdAt?: string;
};

const storefrontImages = [
  'https://images.pexels.com/photos/1235692/pexels-photo-1235692.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/4602025/pexels-photo-4602025.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/34976479/pexels-photo-34976479.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/6342786/pexels-photo-6342786.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/19166246/pexels-photo-19166246.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/858117/pexels-photo-858117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/14750362/pexels-photo-14750362.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/35465939/pexels-photo-35465939.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export function getStorefrontImage(id: string): string {
  const hash = Array.from(id).reduce((total, character) => total + character.charCodeAt(0), 0);
  return storefrontImages[hash % storefrontImages.length];
}

export const getDiscount = (product: Product) =>
  product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
