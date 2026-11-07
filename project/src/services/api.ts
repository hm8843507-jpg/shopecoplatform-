import { getStorefrontImage, type Product } from '@/data';

const configuredApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : '');
if (!configuredApiBaseUrl) {
  throw new Error('VITE_API_URL must be configured for production.');
}
const normalizedApiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '');
const API_BASE_URL = /\/api$/i.test(normalizedApiBaseUrl)
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api`;

type ProductPayload = {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
  title?: unknown;
  price?: unknown;
  originalPrice?: unknown;
  rating?: unknown;
  category?: unknown;
  color?: unknown;
  sizes?: unknown;
  image?: unknown;
  image_url?: unknown;
  storefrontImage?: unknown;
  description?: unknown;
  stock?: unknown;
  brand?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
};

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ProductFilters = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toProduct(payload: unknown): Product {
  if (!isRecord(payload)) {
    throw new Error('The products API returned an invalid product.');
  }

  const product = payload as ProductPayload;
  const id = product.id ?? product._id;
  const name = product.name ?? product.title;
  const price = Number(product.price);

  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    typeof name !== 'string' ||
    !Number.isFinite(price)
  ) {
    throw new Error('The products API returned a product with missing required fields.');
  }

  const sizes = Array.isArray(product.sizes)
    ? product.sizes.filter((size): size is string => typeof size === 'string')
    : [];
  const originalPrice = Number(product.originalPrice);
  const rating = Number(product.rating);
  const stock = Number(product.stock);
  const createdAt = product.createdAt ?? product.created_at;
  const storefrontImage = typeof product.storefrontImage === 'string'
    ? product.storefrontImage.trim()
    : '';

  return {
    id: String(id),
    name,
    price,
    ...(Number.isFinite(originalPrice) && originalPrice > 0 ? { originalPrice } : {}),
    rating: Number.isFinite(rating) ? rating : 4.5,
    category: typeof product.category === 'string' ? product.category : 'All',
    color: typeof product.color === 'string' ? product.color : 'black',
    sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
    image: storefrontImage || getStorefrontImage(String(id)),
    description: typeof product.description === 'string' ? product.description : '',
    ...(Number.isFinite(stock) ? { stock } : {}),
    ...(typeof product.brand === 'string' && product.brand.trim()
      ? { brand: product.brand.trim() }
      : {}),
    ...(typeof createdAt === 'string' ? { createdAt } : {}),
  };
}

async function request(
  path: string,
  signal?: AbortSignal,
  options: { method?: string; body?: string } = {}
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
          ...(localStorage.getItem('shop-auth-token')
            ? { Authorization: `Bearer ${localStorage.getItem('shop-auth-token')}` }
            : {}),
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal,
      ...options,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Unable to reach the shop server. Check that it is running and try again.');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.message === 'string'
      ? payload.message
      : `The shop server returned ${response.status}.`;
    throw new ApiError(message, response.status);
  }
  return payload;
}

function getProductList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload)) {
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
  }
  throw new Error('The products API returned an invalid product list.');
}

export async function getProducts(signal?: AbortSignal, filters: ProductFilters = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (filters.category?.trim()) query.set('category', filters.category.trim());
  if (filters.minPrice !== undefined) query.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) query.set('maxPrice', String(filters.maxPrice));
  if (filters.onSale !== undefined) query.set('onSale', String(filters.onSale));

  const queryString = query.toString();
  const payload = await request(`/products${queryString ? `?${queryString}` : ''}`, signal);
  return getProductList(payload).map(toProduct);
}

export async function getProductById(id: string, signal?: AbortSignal): Promise<Product> {
  const productId = typeof id === 'string' ? id.trim() : '';
  if (!productId) {
    throw new Error('A product ID is required.');
  }

  try {
    const payload = await request(`/products/${encodeURIComponent(productId)}`, signal);
    const product = isRecord(payload) && isRecord(payload.product) ? payload.product : payload;
    return toProduct(product);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;

    const products = await getProducts(signal);
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) throw new Error('Product not found.');
    return product;
  }
}

export type CartLine = {
  cartItemId: string;
  product: Product;
  quantity: number;
  size: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function toAuthUser(payload: unknown): AuthUser {
  if (
    !isRecord(payload) ||
    (typeof payload.id !== 'string' && typeof payload._id !== 'string') ||
    typeof payload.name !== 'string' ||
    typeof payload.email !== 'string'
  ) {
    throw new Error('The authentication API returned an invalid user.');
  }
  return {
    id: String(payload.id ?? payload._id),
    name: payload.name,
    email: payload.email,
    role: typeof payload.role === 'string' ? payload.role : 'User',
  };
}

function toAuthResult(payload: unknown): { token: string; user: AuthUser } {
  if (!isRecord(payload) || typeof payload.token !== 'string' || !isRecord(payload.user)) {
    throw new Error('The authentication API returned an invalid session.');
  }
  return { token: payload.token, user: toAuthUser(payload.user) };
}

export async function login(email: string, password: string) {
  return toAuthResult(await request('/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }));
}

export async function register(name: string, email: string, password: string) {
  return toAuthResult(await request('/auth/register', undefined, {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  }));
}

export async function getCurrentUser() {
  const payload = await request('/auth/me');
  if (!isRecord(payload) || !isRecord(payload.user)) {
    throw new Error('The authentication API returned an invalid profile.');
  }
  return toAuthUser(payload.user);
}

export type CustomerOrder = {
  id: string;
  order_id: string;
  created_at?: string;
  status: string;
  total_amount: number;
  items: Array<{ name: string; quantity: number; size: string }>;
};

export async function getMyOrders(signal?: AbortSignal): Promise<CustomerOrder[]> {
  const payload = await request('/orders/mine', signal);
  const orders = Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.orders) ? payload.orders : null;
  if (!orders) throw new Error('The orders API returned an invalid order list.');
  return orders.map((order): CustomerOrder => {
    if (
      !isRecord(order) ||
      typeof order.order_id !== 'string' ||
      typeof order.status !== 'string' ||
      !Number.isFinite(Number(order.total_amount)) ||
      !Array.isArray(order.items)
    ) {
      throw new Error('The orders API returned an invalid order.');
    }
    return {
      id: String(order.id ?? order._id ?? order.order_id),
      order_id: order.order_id,
      ...(typeof order.created_at === 'string' ? { created_at: order.created_at } : {}),
      status: order.status,
      total_amount: Number(order.total_amount),
      items: order.items.map((item) => ({
        name: isRecord(item) && typeof item.name === 'string' ? item.name : 'Product',
        quantity: isRecord(item) && Number.isInteger(item.quantity) ? Number(item.quantity) : 1,
        size: isRecord(item) && typeof item.size === 'string' ? item.size : '',
      })),
    };
  });
}

function toCartLine(payload: unknown): CartLine {
  if (
    !isRecord(payload) ||
    (typeof payload.id !== 'string' && typeof payload.id !== 'number') ||
    !Number.isInteger(payload.quantity) ||
    Number(payload.quantity) < 1 ||
    typeof payload.size !== 'string'
  ) {
    throw new Error('The cart API returned an invalid item.');
  }

  return {
    cartItemId: String(payload.id),
    product: toProduct(payload.product),
    quantity: Number(payload.quantity),
    size: payload.size,
  };
}

function getCartLine(payload: unknown): CartLine {
  if (!isRecord(payload) || !isRecord(payload.item)) {
    throw new Error('The shop server returned an invalid cart response.');
  }
  return toCartLine(payload.item);
}

export async function getCart(cartId: string): Promise<CartLine[]> {
  const query = new URLSearchParams({ cart_id: cartId });
  const payload = await request(`/cart?${query.toString()}`);
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error('The shop server returned an invalid cart.');
  }
  return payload.items.map(toCartLine);
}

export async function addCartItem(
  cartId: string,
  productId: string,
  quantity: number,
  size: string
): Promise<CartLine> {
  const payload = await request('/cart', undefined, {
    method: 'POST',
    body: JSON.stringify({ cart_id: cartId, product_id: productId, quantity, size }),
  });
  return getCartLine(payload);
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number
): Promise<CartLine> {
  const payload = await request(`/cart/${encodeURIComponent(itemId)}`, undefined, {
    method: 'PUT',
    body: JSON.stringify({ cart_id: cartId, quantity }),
  });
  return getCartLine(payload);
}

export async function removeCartItem(cartId: string, itemId: string): Promise<void> {
  const query = new URLSearchParams({ cart_id: cartId });
  await request(`/cart/${encodeURIComponent(itemId)}?${query.toString()}`, undefined, {
    method: 'DELETE',
  });
}

export async function clearCart(cartId: string): Promise<void> {
  const query = new URLSearchParams({ cart_id: cartId });
  await request(`/cart?${query.toString()}`, undefined, { method: 'DELETE' });
}

export type CheckoutItem = {
  product_id: string;
  quantity: number;
  size: string;
};

export async function createCheckoutOrder(
  customerName: string,
  cartId: string,
  totalAmount: number,
  shippingAddress: {
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  },
  items: CheckoutItem[]
) {
  const payload = await request('/orders/checkout', undefined, {
    method: 'POST',
    body: JSON.stringify({
      customer_name: customerName,
      cart_id: cartId,
      total_amount: totalAmount,
      shipping_address: shippingAddress,
      items,
    }),
  });

  if (
    !isRecord(payload) ||
    !isRecord(payload.order) ||
    typeof payload.order.order_id !== 'string'
  ) {
    throw new Error('The shop server returned an invalid order confirmation.');
  }

  return {
    orderId: payload.order.order_id,
    cartCleared: payload.cart_cleared !== false,
  };
}
