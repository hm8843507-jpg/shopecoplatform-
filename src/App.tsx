import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Facebook,
  Instagram,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Trash2,
  Twitter,
  X,
  Check,
} from 'lucide-react';
import { getDiscount, getStorefrontImage, type Product } from '@/data';
import {
  addCartItem as addCartItemRequest,
  clearCart as clearCartRequest,
  createCheckoutOrder,
  getCart,
  getProductById,
  getProducts,
  removeCartItem as removeCartItemRequest,
  type ShippingAddress,
  updateCartItem as updateCartItemRequest,
} from '@/services/api';
import '@/index.css';

type CartItem = Product & { cartItemId?: string; quantity: number; size: string };
const imageFallback = '/image-placeholder.svg';
const cartIdStorageKey = 'shop-cart-id';
type CatalogProps = {
  products: Product[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

function getOrCreateCartId(): string {
  const storedCartId = localStorage.getItem(cartIdStorageKey);
  if (storedCartId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedCartId)) {
    return storedCartId.toLowerCase();
  }

  const cartId = crypto.randomUUID();
  localStorage.setItem(cartIdStorageKey, cartId);
  return cartId;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars">
      {[0, 1, 2, 3, 4].map((star) => (
        <Star
          key={star}
          size={14}
          fill={star < Math.round(rating) ? 'currentColor' : 'none'}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

function Header({ cartCount, onMenu }: { cartCount: number; onMenu: () => void }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  return (
    <>
      <div className="promo">
        Sign up and get 20% off your first order. <span>Sign Up Now</span>
        <X size={14} />
      </div>
      <header className="header shell">
        <button className="icon-button mobile-only" onClick={onMenu} aria-label="Open menu">
          <SlidersHorizontal size={22} />
        </button>
        <Link to="/" className="logo">SHOP.CO</Link>
        <nav className="desktop-nav">
          <NavLink to="/shop">Shop <ChevronDown size={14} /></NavLink>
          <NavLink to="/shop?onSale=true">On Sale</NavLink>
          <NavLink to="/shop?sort=newest">New Arrivals</NavLink>
          <NavLink to="/shop?view=brands">Brands</NavLink>
        </nav>
        <div className="header-actions">
          <form
            className="search-box"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/shop?search=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for products..."
              aria-label="Search products"
            />
          </form>
          <Link to="/cart" className="action-icon" aria-label="Cart">
            <ShoppingCart size={23} />
            {cartCount > 0 && <b>{cartCount}</b>}
          </Link>
          <button className="action-icon desktop-only" aria-label="Account">
            <CircleUserRound size={23} />
          </button>
        </div>
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-main">
        <div className="footer-brand">
          <div className="logo">SHOP.CO</div>
          <p>We have clothes that suits your style and which you’re proud to wear. From women to men.</p>
          <div className="socials"><a><Twitter size={16} /></a><a><Facebook size={16} /></a><a><Instagram size={16} /></a></div>
        </div>
        <div><h4>Company</h4><a>About</a><a>Features</a><a>Works</a><a>Career</a></div>
        <div><h4>Help</h4><a>Customer Support</a><a>Delivery Details</a><a>Terms &amp; Conditions</a><a>Privacy Policy</a></div>
        <div><h4>FAQ</h4><a>Account</a><a>Manage Deliveries</a><a>Orders</a><a>Payments</a></div>
        <div><h4>Resources</h4><a>Free eBooks</a><a>Development Tutorial</a><a>How to - Blog</a><a>Youtube Playlist</a></div>
      </div>
      <div className="shell footer-bottom">
        <span>Shop.co © 2000-2025, All Rights Reserved</span>
        <div className="payments"><span>VISA</span><span>Mastercard</span><span>PayPal</span><span>Apple Pay</span></div>
      </div>
    </footer>
  );
}

function Layout({
  cart,
  storageError,
  cartError,
  cartSyncing,
  cartBusy,
  onRetryCartSync,
  children,
}: {
  cart: CartItem[];
  storageError: string;
  cartError: string;
  cartSyncing: boolean;
  cartBusy: boolean;
  onRetryCartSync: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <Header
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onMenu={() => setMenuOpen(true)}
      />
      {menuOpen && (
        <div className="mobile-drawer">
          <button className="icon-button drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
          <Link onClick={() => setMenuOpen(false)} to="/shop">Shop</Link>
          <Link onClick={() => setMenuOpen(false)} to="/shop?onSale=true">On Sale</Link>
          <Link onClick={() => setMenuOpen(false)} to="/shop?sort=newest">New Arrivals</Link>
          <Link onClick={() => setMenuOpen(false)} to="/shop?view=brands">Brands</Link>
        </div>
      )}
      {storageError && <p className="state-message error-message shell" role="alert">{storageError}</p>}
      {cartError && (
        <p className="state-message error-message shell" role="alert">
          {cartError}
          <button className="outline-button" onClick={onRetryCartSync} disabled={cartSyncing}>Retry cart sync</button>
        </p>
      )}
      {cartSyncing && <p className="state-message shell" role="status">Syncing your cart...</p>}
      {!cartSyncing && cartBusy && <p className="state-message shell" role="status">Updating your cart...</p>}
      {children}
      <Footer />
    </>
  );
}

function SafeImage({ src, alt }: { src: string; alt: string }) {
  const [imageSource, setImageSource] = useState(src || imageFallback);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  useEffect(() => {
    setImageSource(src || imageFallback);
    setFallbackFailed(false);
  }, [src]);

  if (fallbackFailed) {
    const label = alt || 'Image';
    return <span className="state-message" role="img" aria-label={`${label} unavailable`}>{label} unavailable</span>;
  }

  return (
    <img
      src={imageSource}
      alt={alt}
      onError={() => {
        if (imageSource !== imageFallback) setImageSource(imageFallback);
        else setFallbackFailed(true);
      }}
    />
  );
}

function ProductImage({ product, alt }: { product: Product; alt: string }) {
  return <SafeImage key={product.id} src={getStorefrontImage(product.id)} alt={alt} />;
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/product/${encodeURIComponent(product.id)}`} aria-label={`View ${product.name}`}>
          <ProductImage product={product} alt={product.name} />
        </Link>
        <button
          onClick={() => onAdd(product)}
          aria-label={product.stock === 0 ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
          disabled={product.stock === 0}
          title={product.stock === 0 ? 'Out of stock' : 'Add to cart'}
        >
          <ShoppingCart size={18} />
        </button>
      </div>
      <Link to={`/product/${encodeURIComponent(product.id)}`} className="product-name">{product.name}</Link>
      <div className="rating"><Stars rating={product.rating} /><span>{product.rating}/5</span></div>
      <div className="price-row">
        <strong>${product.price.toFixed(2)}</strong>
        {product.originalPrice && <><del>${product.originalPrice.toFixed(2)}</del><em>-{getDiscount(product)}%</em></>}
      </div>
    </article>
  );
}

function CatalogMessage({ loading, error, onRetry }: Pick<CatalogProps, 'loading' | 'error' | 'onRetry'>) {
  if (loading) return <p className="state-message" role="status">Loading products...</p>;
  if (error) {
    return (
      <div className="state-message error-message" role="alert">
        <span>{error}</span>
        <button className="outline-button" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  return null;
}

function SectionHeading({ title, link = 'View All' }: { title: string; link?: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {link && <Link className="outline-button" to="/shop">{link}</Link>}
    </div>
  );
}

function Home({
  products,
  loading,
  error,
  onRetry,
  onAdd,
}: CatalogProps & { onAdd: (product: Product) => void }) {
  const newArrivals = products.slice(0, 4);
  const topSelling = products.slice(4, 8);

  return (
    <main>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <h1>FIND CLOTHES<br />THAT MATCHES<br />YOUR STYLE</h1>
            <p>Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.</p>
            <Link to="/shop" className="button black-button">Shop Now</Link>
            <div className="metrics">
              <div><strong>200+</strong><span>International Brands</span></div>
              <div><strong>2,000+</strong><span>High-Quality Products</span></div>
              <div><strong>30,000+</strong><span>Happy Customers</span></div>
            </div>
          </div>
          <div className="hero-image">
            <SafeImage src="https://images.pexels.com/photos/15024989/pexels-photo-15024989.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" alt="Fashionable couple" />
            <span className="sparkle sparkle-one">✦</span><span className="sparkle sparkle-two">✦</span>
          </div>
        </div>
      </section>
      <div className="brand-ribbon"><div className="shell brands"><span>VERSACE</span><span>ZARA</span><span>GUCCI</span><span>PRADA</span><span>Calvin Klein</span></div></div>
      <section className="shell products-section">
        <SectionHeading title="NEW ARRIVALS" />
        <CatalogMessage loading={loading} error={error} onRetry={onRetry} />
        {!loading && !error && products.length === 0 && <p className="state-message">No products are available yet.</p>}
        {!loading && !error && <div className="product-grid">{newArrivals.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div>}
      </section>
      <section className="shell products-section divider-top">
        <SectionHeading title="TOP SELLING" />
        {!loading && !error && <div className="product-grid">{topSelling.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div>}
      </section>
      <StyleBrowse />
      <Reviews />
    </main>
  );
}

function StyleBrowse() {
  const styles = [
    { name: 'Casual', image: 'https://images.pexels.com/photos/9431195/pexels-photo-9431195.png?auto=compress&cs=tinysrgb&h=650&w=940' },
    { name: 'Formal', image: 'https://images.pexels.com/photos/16218082/pexels-photo-16218082.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { name: 'Party', image: 'https://images.pexels.com/photos/858117/pexels-photo-858117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { name: 'Gym', image: 'https://images.pexels.com/photos/5331427/pexels-photo-5331427.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  ];
  return (
    <section className="shell style-section">
      <h2>BROWSE BY DRESS STYLE</h2>
      <div className="style-grid">{styles.map((style) => <Link to="/shop" className="style-card" key={style.name}><SafeImage src={style.image} alt={style.name} /><span>{style.name}</span></Link>)}</div>
    </section>
  );
}

function Reviews() {
  const reviews = [
    ['Sarah M.', 'The clothes are absolutely amazing! The quality and attention to detail exceeded my expectations.', '4.5'],
    ['Alex K.', 'Finding clothes that align with my personal style used to be a challenge until I discovered Shop.co.', '5'],
    ['James L.', 'As someone who is always on the lookout for unique fashion pieces, I am thrilled to have found this store.', '4.5'],
  ];
  return (
    <section className="shell reviews">
      <SectionHeading title="OUR HAPPY CUSTOMERS" link="" />
      <div className="review-grid">{reviews.map(([name, copy, rating]) => <div className="review" key={name}><div className="review-stars"><Stars rating={Number(rating)} /></div><h4>{name} <Check size={14} /></h4><p>“{copy}”</p></div>)}</div>
    </section>
  );
}

function Breadcrumb({ current }: { current: string }) {
  return <div className="shell breadcrumb"><Link to="/">Home</Link><ChevronRight size={14} /><span>{current}</span></div>;
}

type ShopFilters = {
  category: string;
  minPrice: number;
  maxPrice: number;
  color: string;
  size: string;
};

function FilterPanel({
  categories,
  colors,
  sizes,
  priceLimit,
  filters,
  onChange,
  onApply,
  onClear,
  onClose,
}: {
  categories: string[];
  colors: string[];
  sizes: string[];
  priceLimit: number;
  filters: ShopFilters;
  onChange: (filters: ShopFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  return (
    <aside className="filter-panel">
      <div className="filter-head">
        <h3>Filters</h3>
        {onClose ? (
          <button onClick={onClose} aria-label="Close filters"><X /></button>
        ) : <SlidersHorizontal size={20} />}
      </div>
      <div className="filter-block">
        <h4>Category</h4>
        <select
          className="filter-select"
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
        >
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>
      <div className="filter-block">
        <h4>Price</h4>
        <div className="price-range-inputs">
          <label>Min $<input
            type="number"
            min={0}
            max={filters.maxPrice}
            value={filters.minPrice}
            onChange={(event) => {
              const value = Math.max(0, Math.min(Number(event.target.value) || 0, filters.maxPrice));
              onChange({ ...filters, minPrice: value });
            }}
          /></label>
          <label>Max $<input
            type="number"
            min={filters.minPrice}
            max={priceLimit}
            value={filters.maxPrice}
            onChange={(event) => {
              const value = Math.max(filters.minPrice, Math.min(Number(event.target.value) || 0, priceLimit));
              onChange({ ...filters, maxPrice: value });
            }}
          /></label>
        </div>
        <label className="range-label">Maximum price: ${filters.maxPrice}
          <input
            type="range"
            min="0"
            max={priceLimit}
            value={filters.maxPrice}
            aria-label="Maximum price"
            onChange={(event) => onChange({
              ...filters,
              maxPrice: Math.max(filters.minPrice, Number(event.target.value)),
            })}
          />
        </label>
      </div>
      <div className="filter-block">
        <h4>Colors</h4>
        <div className="color-palette">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`Filter by ${color}`}
              aria-pressed={filters.color === color}
              className={filters.color === color ? 'selected' : ''}
              style={{ background: color }}
              onClick={() => onChange({ ...filters, color: filters.color === color ? '' : color })}
            />
          ))}
          {colors.length === 0 && <span className="filter-empty">No colors available</span>}
        </div>
      </div>
      <div className="filter-block">
        <h4>Size</h4>
        <div className="size-grid">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              className={filters.size === size ? 'selected' : ''}
              aria-pressed={filters.size === size}
              onClick={() => onChange({ ...filters, size: filters.size === size ? '' : size })}
            >{size}</button>
          ))}
          {sizes.length === 0 && <span className="filter-empty">No sizes available</span>}
        </div>
      </div>
      <div className="filter-actions">
        <button className="button black-button apply" onClick={onApply}>Apply Filter</button>
        <button className="clear-filters" onClick={onClear}>Clear filters</button>
      </div>
    </aside>
  );
}

function Shop({ products, loading, error, onRetry, onAdd }: CatalogProps & { onAdd: (product: Product) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const priceLimit = Math.max(1, Math.ceil(Math.max(0, ...products.map((product) => product.price))));
  const [draftFilters, setDraftFilters] = useState<ShopFilters>({
    category: 'All',
    minPrice: 0,
    maxPrice: priceLimit,
    color: '',
    size: '',
  });
  const [activeFilters, setActiveFilters] = useState<ShopFilters>(draftFilters);

  useEffect(() => {
    setDraftFilters((current) => ({ ...current, maxPrice: priceLimit }));
    setActiveFilters((current) => ({ ...current, maxPrice: priceLimit }));
  }, [priceLimit]);

  const categories = ['All', ...new Set(
    products.map((product) => product.category).filter((category) => category && category !== 'All')
  )];
  const colors = Array.from(new Set(products.map((product) => product.color).filter(Boolean)));
  const sizes = Array.from(new Set(products.flatMap((product) => product.sizes)));
  const brands = Array.from(new Set(products.map((product) => product.brand).filter((brand): brand is string => Boolean(brand))));
  const brandChoices = brands.length ? brands : products.length ? ['All Products'] : [];
  const sort = searchParams.get('sort') || 'popular';
  const brandFilter = searchParams.get('brand') || '';
  const onSale = searchParams.get('onSale') === 'true';
  const brandDirectory = searchParams.get('view') === 'brands';
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search) &&
    (activeFilters.category === 'All' || product.category === activeFilters.category) &&
    product.price >= activeFilters.minPrice &&
    product.price <= activeFilters.maxPrice &&
    (!activeFilters.color || product.color.toLowerCase() === activeFilters.color.toLowerCase()) &&
    (!activeFilters.size || product.sizes.includes(activeFilters.size)) &&
    (!brandFilter || product.brand?.toLowerCase() === brandFilter.toLowerCase()) &&
    (!onSale || Boolean(product.originalPrice && product.originalPrice > product.price))
  ).sort((first, second) => {
    if (sort === 'price-asc') return first.price - second.price;
    if (sort === 'price-desc') return second.price - first.price;
    if (sort === 'newest' && first.createdAt && second.createdAt) {
      return Date.parse(second.createdAt) - Date.parse(first.createdAt);
    }
    return 0;
  });

  const applyFilters = () => {
    setActiveFilters(draftFilters);
    setFilterOpen(false);
  };
  const clearFilters = () => {
    const reset = { category: 'All', minPrice: 0, maxPrice: priceLimit, color: '', size: '' };
    setDraftFilters(reset);
    setActiveFilters(reset);
    setSearchParams((current) => {
      current.delete('brand');
      current.delete('onSale');
      return current;
    });
  };
  const changeSort = (value: string) => {
    setSearchParams((current) => {
      if (value === 'popular') current.delete('sort');
      else current.set('sort', value);
      return current;
    });
  };

  return (
    <main>
      <Breadcrumb current="Shop" />
      <div className="shell shop-layout">
        <div className={`filter-overlay ${filterOpen ? 'open' : ''}`} onClick={() => setFilterOpen(false)} />
        <div className={`filter-drawer ${filterOpen ? 'open' : ''}`}>
          <FilterPanel
            categories={categories}
            colors={colors}
            sizes={sizes}
            priceLimit={priceLimit}
            filters={draftFilters}
            onChange={setDraftFilters}
            onApply={applyFilters}
            onClear={clearFilters}
            onClose={() => setFilterOpen(false)}
          />
        </div>
        <div className="desktop-filter">
          <FilterPanel
            categories={categories}
            colors={colors}
            sizes={sizes}
            priceLimit={priceLimit}
            filters={draftFilters}
            onChange={setDraftFilters}
            onApply={applyFilters}
            onClear={clearFilters}
          />
        </div>
        <section className="shop-results">
          <div className="shop-toolbar">
            <div>
              <h1>{brandDirectory ? 'Brands' : onSale ? 'On Sale' : sort === 'newest' ? 'New Arrivals' : 'Shop'}</h1>
              <span>{loading ? 'Loading products...' : brandDirectory ? `${brandChoices.length} brands` : `Showing ${filteredProducts.length} products`}</span>
            </div>
            <div className="toolbar-actions">
              <button className="filter-trigger" onClick={() => setFilterOpen(true)}>
                <SlidersHorizontal size={16} /> Filters
              </button>
              <label>Sort by:
                <select value={sort} onChange={(event) => changeSort(event.target.value)}>
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>
          <CatalogMessage loading={loading} error={error} onRetry={onRetry} />
          {!loading && !error && brandDirectory && brandChoices.length === 0 && <p className="state-message">No brands are available yet.</p>}
          {!loading && !error && brandDirectory && brandChoices.length > 0 && (
            <div className="brand-directory">
              {brandChoices.map((brand) => (
                <Link
                  key={brand}
                  to={brand === 'All Products' ? '/shop' : `/shop?brand=${encodeURIComponent(brand)}`}
                  className="brand-directory-card"
                >{brand}<ChevronRight size={18} /></Link>
              ))}
            </div>
          )}
          {!loading && !error && !brandDirectory && filteredProducts.length === 0 && <p className="state-message">No products match the selected filters.</p>}
          {!loading && !error && !brandDirectory && <div className="shop-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div>}
        </section>
      </div>
    </main>
  );
}

function ProductPage({ onAdd }: { onAdd: (product: Product, size: string, quantity: number) => void }) {
  const { id = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState('');
  const [tab, setTab] = useState('details');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setProduct(null);
    getProductById(id, controller.signal)
      .then((result) => {
        setProduct(result);
        setImage(result.image);
        setSize(result.sizes[1] || result.sizes[0] || '');
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load this product.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  if (loading) return <main><Breadcrumb current="Product" /><p className="shell state-message" role="status">Loading product...</p></main>;
  if (error || !product) {
    return <main><Breadcrumb current="Product" /><div className="shell state-message error-message" role="alert">{error || 'Product not found.'}<Link to="/shop" className="outline-button">Back to shop</Link></div></main>;
  }

  return (
    <main>
      <Breadcrumb current={product.name} />
      <div className="shell product-detail">
        <div className="product-gallery">
          <div className="thumbs">{[product.image].map((src) => <button key={src} className={image === src ? 'selected' : ''} onClick={() => setImage(src)}><ProductImage product={product} alt="" /></button>)}</div>
          <div className="main-product-image"><ProductImage product={product} alt={product.name} /></div>
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="rating large"><Stars rating={product.rating} /><strong>{product.rating}/5</strong></div>
          <div className="detail-price"><strong>${product.price.toFixed(2)}</strong>{product.originalPrice && <><del>${product.originalPrice.toFixed(2)}</del><em>-{getDiscount(product)}%</em></>}</div>
          <p>{product.description}</p>
          <hr />
          <div className="choice"><h4>Color</h4><div className="selected-color"><button className="color-dot" style={{ background: product.color }} aria-label={product.color}><Check size={14} /></button></div></div>
          <div className="choice"><h4>Choose Size</h4><div className="detail-sizes">{product.sizes.map((item) => <button className={size === item ? 'selected' : ''} key={item} onClick={() => setSize(item)}>{item}</button>)}</div></div>
          <div className="purchase">
            <div className="quantity">
              <button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
              <span>{quantity}</span>
              <button
                aria-label="Increase quantity"
                disabled={product.stock !== undefined && quantity >= product.stock}
                onClick={() => setQuantity(quantity + 1)}
              ><Plus size={16} /></button>
            </div>
            <button
              className="button black-button"
              disabled={product.stock === 0}
              onClick={() => onAdd(product, size, quantity)}
            >{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</button>
          </div>
        </div>
      </div>
      <section className="shell detail-tabs">
        <div className="tabs">
          <button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>Product Details</button>
          <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>Rating &amp; Reviews</button>
          <button className={tab === 'faq' ? 'active' : ''} onClick={() => setTab('faq')}>FAQs</button>
        </div>
        {tab === 'details' && <div className="detail-content"><h2>Elevate your everyday style</h2><p>{product.description}</p></div>}
        {tab === 'reviews' && <div className="detail-content"><p>Customer reviews are not available yet.</p></div>}
        {tab === 'faq' && <div className="detail-content faq"><h3>How does the fit run?</h3><p>Please refer to the available sizes for this product.</p><h3>How should I care for it?</h3><p>Follow the care instructions provided with your item.</p></div>}
      </section>
    </main>
  );
}

function CartPage({
  cart,
  onCheckout,
  onRemove,
  onUpdateQuantity,
  cartSyncing,
  cartBusy,
}: {
  cart: CartItem[];
  onCheckout: (
    customerName: string,
    shippingAddress: ShippingAddress,
    items: CartItem[],
    totalAmount: number
  ) => Promise<string>;
  onRemove: (item: CartItem) => Promise<void>;
  onUpdateQuantity: (item: CartItem, amount: number) => Promise<void>;
  cartSyncing: boolean;
  cartBusy: boolean;
}) {
  const [customerName, setCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  const [checkoutError, setCheckoutError] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal * 0.2;
  const total = subtotal - discount + (subtotal ? 15 : 0);
  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError('');
    setSubmitting(true);
    try {
      const orderId = await onCheckout(customerName.trim(), shippingAddress, cart, total);
      setOrderConfirmation(`Order ${orderId} was placed successfully.`);
      setCustomerName('');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to place your order.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main>
      <Breadcrumb current="Cart" />
      <section className="shell cart-page">
        <h1>YOUR CART</h1>
        {orderConfirmation && <p className="checkout-success" role="status">{orderConfirmation}</p>}
        {!cart.length ? (
          <div className="empty-cart"><ShoppingCart size={42} /><h2>Your cart is empty</h2><p>Discover something new and add it to your cart.</p><Link to="/shop" className="button black-button">Continue Shopping</Link></div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">{cart.map((item) => (
              <div className="cart-item" key={`${item.id}-${item.size}`}>
                <ProductImage product={item} alt={item.name} />
                <div className="cart-item-info"><Link to={`/product/${encodeURIComponent(item.id)}`}><h3>{item.name}</h3></Link><span>Size: {item.size}</span><span>Color: {item.color}</span><strong>${item.price.toFixed(2)}</strong></div>
                <button className="delete-item" aria-label={`Remove ${item.name}`} disabled={cartBusy || cartSyncing} onClick={() => void onRemove(item)}><Trash2 size={19} /></button>
                <div className="quantity cart-quantity">
                  <button aria-label="Decrease quantity" disabled={cartBusy || cartSyncing || item.quantity <= 1} onClick={() => void onUpdateQuantity(item, -1)}><Minus size={15} /></button>
                  <span>{item.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    disabled={cartBusy || cartSyncing || (item.stock !== undefined && cart.filter((entry) => entry.id === item.id).reduce((sum, entry) => sum + entry.quantity, 0) >= item.stock)}
                    onClick={() => void onUpdateQuantity(item, 1)}
                  ><Plus size={15} /></button>
                </div>
              </div>
            ))}</div>
            <aside className="summary">
              <h2>Order Summary</h2>
              <div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
              <div><span>Discount (-20%)</span><strong className="red">-${discount.toFixed(2)}</strong></div>
              <div><span>Delivery Fee</span><strong>$15.00</strong></div>
              <hr />
              <div className="total"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
              <div className="promo-input"><input placeholder="Add promo code" /><button>Apply</button></div>
              <form className="checkout-form" onSubmit={handleCheckout}>
                <label htmlFor="checkout-customer-name">Your name</label>
                <input
                  id="checkout-customer-name"
                  name="customer_name"
                  autoComplete="name"
                  required
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Enter your full name"
                />
                <label htmlFor="checkout-address">Street address</label>
                <input
                  id="checkout-address"
                  name="address_line1"
                  autoComplete="address-line1"
                  required
                  value={shippingAddress.address_line1}
                  onChange={(event) => setShippingAddress((address) => ({ ...address, address_line1: event.target.value }))}
                  placeholder="Street address"
                />
                <label htmlFor="checkout-city">City</label>
                <input
                  id="checkout-city"
                  name="city"
                  autoComplete="address-level2"
                  required
                  value={shippingAddress.city}
                  onChange={(event) => setShippingAddress((address) => ({ ...address, city: event.target.value }))}
                  placeholder="City"
                />
                <label htmlFor="checkout-state">State / Province</label>
                <input
                  id="checkout-state"
                  name="state"
                  autoComplete="address-level1"
                  required
                  value={shippingAddress.state}
                  onChange={(event) => setShippingAddress((address) => ({ ...address, state: event.target.value }))}
                  placeholder="State or province"
                />
                <label htmlFor="checkout-postal-code">Postal code</label>
                <input
                  id="checkout-postal-code"
                  name="postal_code"
                  autoComplete="postal-code"
                  required
                  value={shippingAddress.postal_code}
                  onChange={(event) => setShippingAddress((address) => ({ ...address, postal_code: event.target.value }))}
                  placeholder="Postal code"
                />
                <label htmlFor="checkout-country">Country</label>
                <input
                  id="checkout-country"
                  name="country"
                  autoComplete="country-name"
                  required
                  value={shippingAddress.country}
                  onChange={(event) => setShippingAddress((address) => ({ ...address, country: event.target.value }))}
                  placeholder="Country"
                />
                {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
                <button className="button black-button checkout" type="submit" disabled={submitting || cartBusy || cartSyncing}>
                  {submitting ? 'Placing order...' : cartSyncing ? 'Syncing cart...' : 'Place Order'} <ArrowRight size={18} />
                </button>
              </form>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartId, setCartId] = useState('');
  const [cartSyncing, setCartSyncing] = useState(true);
  const [cartSynced, setCartSynced] = useState(false);
  const [cartRetryKey, setCartRetryKey] = useState(0);
  const [cartError, setCartError] = useState('');
  const [pendingCartActions, setPendingCartActions] = useState(0);
  const [storageError, setStorageError] = useState('');
  const cartBusy = pendingCartActions > 0;

  const retryCatalog = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCatalogError('');
    getProducts(controller.signal)
      .then(setProducts)
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setCatalogError(requestError instanceof Error ? requestError.message : 'Unable to load products.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    try {
      localStorage.removeItem('shop-cart');
      setCart([]);
      setCartId(getOrCreateCartId());
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to read the saved cart.');
    } finally {
      setCartReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cartReady || !cartId) {
      if (cartReady) setCartSyncing(false);
      return;
    }

    const syncCart = async () => {
      setCartSyncing(true);
      setCartSynced(false);
      setCartError('');
      try {
        const serverCart = await getCart(cartId);
        setCart(serverCart.map((item) => ({
          ...item.product,
          cartItemId: item.cartItemId,
          quantity: item.quantity,
          size: item.size,
        })));
        setCartSynced(true);
      } catch (error) {
        setCart([]);
        setCartError(error instanceof Error ? error.message : 'Unable to sync your cart.');
      } finally {
        setCartSyncing(false);
      }
    };

    void syncCart();
  }, [cartId, cartReady, cartRetryKey]);

  useEffect(() => {
    if (!cartReady || loading || catalogError || products.length === 0) return;
    const productsById = new Map(products.map((product) => [product.id, product]));
    setCart((items) => items.map((item) => {
      const currentProduct = productsById.get(item.id);
      return currentProduct
        ? {
          ...currentProduct,
          cartItemId: item.cartItemId,
          quantity: item.quantity,
          size: item.size,
        }
        : item;
    }));
  }, [products, cartReady, loading, catalogError]);

  const addToCart = async (product: Product, size?: string, quantity = 1) => {
    const selectedSize = size || product.sizes[1] || product.sizes[0] || 'One size';
    if (product.stock !== undefined && product.stock < 1) {
      setCartError(`${product.name} is out of stock.`);
      return;
    }
    if (cartSyncing || !cartSynced || !cartId) {
      setCartError('Your cart is still syncing. Please try again in a moment.');
      return;
    }

    setCartError('');
    setPendingCartActions((count) => count + 1);
    try {
      const savedItem = await addCartItemRequest(cartId, product.id, quantity, selectedSize);
      setCart((items) => [
        ...items.filter((item) => item.id !== savedItem.product.id || item.size !== savedItem.size),
        {
          ...savedItem.product,
          cartItemId: savedItem.cartItemId,
          quantity: savedItem.quantity,
          size: savedItem.size,
        },
      ]);
      setCartSynced(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to add this item to your cart.');
    } finally {
      setPendingCartActions((count) => Math.max(0, count - 1));
    }
  };

  const removeFromCart = async (item: CartItem) => {
    if (!cartId || !item.cartItemId) {
      setCartError('This cart item is not synced yet. Please try again.');
      return;
    }

    setCartError('');
    setPendingCartActions((count) => count + 1);
    try {
      await removeCartItemRequest(cartId, item.cartItemId);
      setCart((items) => items.filter((current) => current.cartItemId !== item.cartItemId));
      setCartSynced(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to remove this item from your cart.');
    } finally {
      setPendingCartActions((count) => Math.max(0, count - 1));
    }
  };

  const updateCartQuantity = async (item: CartItem, amount: number) => {
    if (!cartId || !item.cartItemId) {
      setCartError('This cart item is not synced yet. Please try again.');
      return;
    }

    const quantity = Math.max(1, item.quantity + amount);
    if (quantity === item.quantity) return;
    if (
      amount > 0 &&
      item.stock !== undefined &&
      cart.filter((entry) => entry.id === item.id).reduce((sum, entry) => sum + entry.quantity, 0) >= item.stock
    ) {
      return;
    }

    setCartError('');
    setPendingCartActions((count) => count + 1);
    try {
      const savedItem = await updateCartItemRequest(cartId, item.cartItemId, quantity);
      setCart((items) => items.map((current) => current.cartItemId === savedItem.cartItemId
        ? {
          ...savedItem.product,
          cartItemId: savedItem.cartItemId,
          quantity: savedItem.quantity,
          size: savedItem.size,
        }
        : current));
      setCartSynced(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to update this cart item.');
    } finally {
      setPendingCartActions((count) => Math.max(0, count - 1));
    }
  };

  const checkout = async (
    customerName: string,
    shippingAddress: ShippingAddress,
    items: CartItem[],
    totalAmount: number
  ) => {
    const result = await createCheckoutOrder(
      cartId,
      customerName,
      totalAmount,
      shippingAddress,
      items.map(({ id, quantity, size }) => ({
        product_id: id,
        quantity,
        size,
      }))
    );
    try {
      await clearCartRequest(cartId);
    } catch (error) {
      setCartError(
        error instanceof Error
          ? `Order placed, but the saved cart could not be cleared: ${error.message}`
          : 'Order placed, but the saved cart could not be cleared.'
      );
    }
    setCart([]);
    setCartSynced(true);
    return result.orderId;
  };

  const catalogProps = { products, loading, error: catalogError, onRetry: retryCatalog };
  const retryCartSync = useCallback(() => setCartRetryKey((key) => key + 1), []);
  return (
    <BrowserRouter>
      <Layout
        cart={cart}
        storageError={storageError}
        cartError={cartError}
        cartSyncing={cartSyncing}
        cartBusy={cartBusy}
        onRetryCartSync={retryCartSync}
      >
        <Routes>
          <Route path="/" element={<Home {...catalogProps} onAdd={addToCart} />} />
          <Route path="/shop" element={<Shop {...catalogProps} onAdd={addToCart} />} />
          <Route path="/category" element={<Shop {...catalogProps} onAdd={addToCart} />} />
          <Route path="/product/:id" element={<ProductPage onAdd={addToCart} />} />
          <Route
            path="/cart"
            element={(
              <CartPage
                cart={cart}
                onCheckout={checkout}
                onRemove={removeFromCart}
                onUpdateQuantity={updateCartQuantity}
                cartSyncing={cartSyncing}
                cartBusy={cartBusy}
              />
            )}
          />
          <Route path="*" element={<main className="shell state-message"><p>Page not found.</p><Link to="/" className="outline-button">Go home</Link></main>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
