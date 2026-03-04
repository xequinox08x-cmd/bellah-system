const API_BASE = "http://localhost:4000/api";

export const api = {
  // PRODUCTS
  async getProducts() {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  },

  // SALES LIST
  async getSales() {
    const res = await fetch(`${API_BASE}/sales`);
    if (!res.ok) throw new Error("Failed to fetch sales");
    return res.json();
  },

  // GET SALE BY ID
  async getSaleById(id: number) {
    const res = await fetch(`${API_BASE}/sales/${id}`);
    if (!res.ok) throw new Error("Failed to fetch sale");
    return res.json();
  },

  // CREATE SALE
  async createSale(data: {
    items: { productId: number; qty: number; unitPrice: number }[];
  }) {
    const res = await fetch(`${API_BASE}/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create sale");
    }

    return res.json();
  },
};

