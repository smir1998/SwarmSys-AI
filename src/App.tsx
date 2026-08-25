import { useCallback, useState } from "react";
import CartDrawer from "./components/CartDrawer";
import Catalog from "./components/Catalog";
import Footer from "./components/Footer";
import Glyphs from "./components/Glyphs";
import InUse from "./components/InUse";
import Nav from "./components/Nav";
import Specimen from "./components/Specimen";
import Tester from "./components/Tester";

export default function App() {
  const [theme, setTheme] = useState<"paper" | "ink">("paper");
  const [cart, setCart] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const toggleCart = useCallback((id: string) => {
    setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }, []);
  const removeFromCart = useCallback((id: string) => setCart((c) => c.filter((x) => x !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);

  return (
    <div data-theme={theme} className="min-h-screen bg-bg font-grotesk text-ink">
      <div className="noise" aria-hidden="true" />
      <Nav
        theme={theme}
        onTheme={() => setTheme((t) => (t === "paper" ? "ink" : "paper"))}
        cartCount={cart.length}
        onCart={() => setCartOpen(true)}
      />
      <main>
        <Specimen />
        <Tester />
        <Catalog cart={cart} onToggle={toggleCart} />
        <Glyphs />
        <InUse />
      </main>
      <Footer />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onRemove={removeFromCart}
        onClear={clearCart}
      />
    </div>
  );
}
