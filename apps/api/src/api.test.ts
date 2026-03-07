import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { pool } from './db/pool';

vi.mock('./db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

const queryMock = vi.mocked(pool.query);

describe('API functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns 200 with ok and db true when DB responds', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ now: new Date() }], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, db: true });
    });

    it('returns 500 with db false when DB fails', async () => {
      queryMock.mockRejectedValueOnce(new Error('Connection failed'));
      const app = createApp();
      const res = await request(app).get('/health');
      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({ ok: false, db: false });
    });
  });

  describe('Products CRUD', () => {
    const productPayload = {
      sku: 'TEST-SMOKE-001',
      name: 'Smoke test product',
      category: 'Skincare',
      price: 10,
      cost: 5,
      stock: 100,
      lowStockThreshold: 10,
      description: 'For API test',
    };

    it('POST /api/products returns 201 and created product with id, sku, name', async () => {
      const created = {
        id: 1,
        sku: productPayload.sku,
        name: productPayload.name,
        category: productPayload.category,
        price: productPayload.price,
        cost: productPayload.cost,
        stock: productPayload.stock,
        lowStockThreshold: productPayload.lowStockThreshold,
        description: productPayload.description,
        created_at: new Date(),
        updated_at: new Date(),
      };
      queryMock.mockResolvedValueOnce({ rows: [created], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app).post('/api/products').send(productPayload);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 1, sku: productPayload.sku, name: productPayload.name });
    });

    it('POST /api/products returns 400 when sku or name missing', async () => {
      const app = createApp();
      const res = await request(app).post('/api/products').send({ name: 'Only name' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('sku');
    });

    it('GET /api/products returns 200 and array', async () => {
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const app = createApp();
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('PUT /api/products/:id returns 200 and updated product', async () => {
      const updated = {
        id: 1,
        sku: 'UPDATED-SKU',
        name: 'Updated name',
        category: 'Skincare',
        price: 20,
        cost: 8,
        stock: 50,
        lowStockThreshold: 5,
        description: 'Updated',
        created_at: new Date(),
        updated_at: new Date(),
      };
      queryMock.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app)
        .put('/api/products/1')
        .send({ ...productPayload, sku: 'UPDATED-SKU', name: 'Updated name' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 1, sku: 'UPDATED-SKU', name: 'Updated name' });
    });

    it('PUT /api/products/:id returns 404 when product not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const app = createApp();
      const res = await request(app).put('/api/products/999').send(productPayload);
      expect(res.status).toBe(404);
    });

    it('DELETE /api/products/:id returns 200 with ok and deletedId', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app).delete('/api/products/1');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, deletedId: 1 });
    });

    it('DELETE /api/products/:id returns 404 when product not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const app = createApp();
      const res = await request(app).delete('/api/products/999');
      expect(res.status).toBe(404);
    });
  });
});
