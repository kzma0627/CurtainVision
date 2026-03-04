import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("cv_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const serializable = items.map(({ windowPhoto, ...rest }) => ({
      ...rest,
      windowPhoto: windowPhoto
        ? {
            previewUrl: windowPhoto.isManual ? null : windowPhoto.previewUrl,
            githubUrl: windowPhoto.githubUrl,
            filename: windowPhoto.filename,
            isManual: windowPhoto.isManual,
          }
        : null,
    }));
    localStorage.setItem("cv_cart", JSON.stringify(serializable));
  }, [items]);

  const addItem = (item) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() }]);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearCart = () => setItems([]);

  const totalEstimate = items.reduce((sum, it) => sum + (it.pricing?.totalPrice || 0), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalEstimate }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
