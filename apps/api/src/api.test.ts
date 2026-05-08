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
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_CAPTION_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_IMAGE_MODEL;
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryMock.mockResolvedValueOnce({ rows: [created], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app).post('/api/products').send(productPayload);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        ok: true,
        data: { id: 1, sku: productPayload.sku, name: productPayload.name },
      });
    });

    it('POST /api/products returns 400 when sku or name missing', async () => {
      const app = createApp();
      const res = await request(app).post('/api/products').send({ name: 'Only name' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        ok: false,
        message: 'sku and name are required',
      });
    });

    it('GET /api/products returns 200 and only queries active products', async () => {
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const app = createApp();
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, data: [] });
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('is_active = TRUE'),
        []
      );
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryMock.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app)
        .put('/api/products/1')
        .send({ ...productPayload, sku: 'UPDATED-SKU', name: 'Updated name' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        data: { id: 1, sku: 'UPDATED-SKU', name: 'Updated name' },
      });
    });

    it('PUT /api/products/:id returns 404 when product not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const app = createApp();
      const res = await request(app).put('/api/products/999').send(productPayload);
      expect(res.status).toBe(404);
    });

    it('DELETE /api/products/:id permanently deletes unused products', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as any);
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app).delete('/api/products/1');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        data: { id: 1, action: 'deleted' },
        message: 'Product deleted successfully.',
      });
    });

    it('DELETE /api/products/:id archives products already used in sales', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as any);
      queryMock.mockResolvedValueOnce({ rows: [{ product_id: 1 }], rowCount: 1 } as any);
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as any);
      const app = createApp();
      const res = await request(app).delete('/api/products/1');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        data: { id: 1, action: 'archived' },
        message: 'Product archived because it already exists in sales records.',
      });
    });

    it('DELETE /api/products/:id returns 400 for an invalid id', async () => {
      const app = createApp();
      const res = await request(app).delete('/api/products/not-a-number');
      expect(res.status).toBe(400);
    });

    it('DELETE /api/products/:id returns 404 when product not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const app = createApp();
      const res = await request(app).delete('/api/products/999');
      expect(res.status).toBe(404);
    });
  });

  describe('AI content generation', () => {
    function mockAiContentQueries(productOverrides?: Partial<{ name: string; category: string; price: number; description: string }>) {
      queryMock.mockImplementation(async (sql: string) => {
        if (sql.includes('CREATE TABLE') || sql.includes('ALTER TABLE')) {
          return { rows: [], rowCount: 0 } as any;
        }

        if (sql.includes('FROM products')) {
          return {
            rows: [
              {
                id: 1,
                name: productOverrides?.name ?? 'Rose Glow Serum',
                category: productOverrides?.category ?? 'Skincare',
                price: productOverrides?.price ?? 299,
                description: productOverrides?.description ?? 'Hydrating brightening serum',
              },
            ],
            rowCount: 1,
          } as any;
        }

        if (sql.includes('INSERT INTO ai_contents')) {
          return { rows: [{ id: 77, status: 'draft' }], rowCount: 1 } as any;
        }

        return { rows: [], rowCount: 0 } as any;
      });
    }

    it('POST /api/ai/generate uses OpenAI for captions in text mode', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_text: 'Glow brighter with Rose Glow Serum. Shop now and treat your skin today.',
        }),
      });

      vi.stubGlobal('fetch', fetchMock as any);
      mockAiContentQueries();

      const app = createApp();
      const res = await request(app).post('/api/ai/generate').send({
        productId: 1,
        promptText: 'Create a polished Facebook caption for busy professionals',
        contentType: 'caption',
        tone: 'professional',
        outputMode: 'text',
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        data: {
          id: 77,
          caption: 'Glow brighter with Rose Glow Serum. Shop now and treat your skin today.',
          generatedImageUrl: null,
          outputMode: 'text',
          status: 'draft',
        },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-openai-key',
          }),
        })
      );
    });

    it('POST /api/ai/generate uses Gemini only for image mode', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'Poster generated for review.' },
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: 'QUJDRA==',
                    },
                  },
                ],
              },
            },
          ],
        }),
      });

      vi.stubGlobal('fetch', fetchMock as any);
      mockAiContentQueries();

      const app = createApp();
      const res = await request(app).post('/api/ai/generate').send({
        productId: 1,
        promptText: 'Create a premium pink product poster',
        contentType: 'promotion',
        tone: 'fun',
        outputMode: 'image',
        referenceImageUrl: 'data:image/png;base64,cHJvZHVjdA==',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.caption).toBe('Poster generated for review.');
      expect(res.status).toBe(200);
      expect(res.body.data.generatedImageUrl).toBe('data:image/png;base64,QUJDRA==');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent'
      );

      const geminiRequest = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
      expect(geminiRequest.contents[0].parts[0]).toEqual(
        expect.objectContaining({
          inlineData: {
            mimeType: 'image/png',
            data: 'cHJvZHVjdA==',
          },
        })
      );
      expect(geminiRequest.contents[0].parts[1]).toEqual(
        expect.objectContaining({
          text: expect.stringContaining('exact product reference'),
        })
      );
      expect(geminiRequest.contents[0].parts[2].text).toContain('source of truth');
    });

    it('POST /api/ai/generate uses OpenAI and Gemini for text_image mode', async () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            output_text: 'Fresh skin starts here. Grab Rose Glow Serum now and glow all day.',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: 'QUJDRA==',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        });

      vi.stubGlobal('fetch', fetchMock as any);
      mockAiContentQueries();

      const app = createApp();
      const res = await request(app).post('/api/ai/generate').send({
        productId: 1,
        promptText: 'Create a premium pink product poster',
        contentType: 'promotion',
        tone: 'fun',
        outputMode: 'text_image',
        referenceImageUrl: 'data:image/png;base64,cHJvZHVjdA==',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.caption).toBe('Fresh skin starts here. Grab Rose Glow Serum now and glow all day.');
      expect(res.body.data.generatedImageUrl).toBe('data:image/png;base64,QUJDRA==');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const geminiRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
      expect(geminiRequest.contents[0].parts[0]).toEqual(
        expect.objectContaining({
          inlineData: {
            mimeType: 'image/png',
            data: 'cHJvZHVjdA==',
          },
        })
      );
      expect(geminiRequest.contents[0].parts[2].text).toContain('Preserve the same product identity');
    });

    it('POST /api/ai/generate falls back for text_image mode when AI keys are missing', async () => {
      mockAiContentQueries();

      const app = createApp();
      const res = await request(app).post('/api/ai/generate').send({
        productId: 1,
        promptText: 'Create a test caption for scheduling verification',
        contentType: 'caption',
        tone: 'fun',
        outputMode: 'text_image',
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        data: {
          id: 77,
          outputMode: 'text_image',
          status: 'draft',
        },
      });
      expect(res.body.data.caption).toContain('Create a test caption for scheduling verification');
      expect(res.body.data.generatedImageUrl).toContain('data:image/svg+xml');
    });

    it('POST /api/ai/generate falls back for image mode when Gemini is unavailable', async () => {
      mockAiContentQueries();

      const app = createApp();
      const res = await request(app).post('/api/ai/generate').send({
        productId: 1,
        promptText: 'Create a poster-only preview',
        contentType: 'promotion',
        tone: 'fun',
        outputMode: 'image',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.caption).toContain('poster generated and ready for review');
      expect(res.body.data.generatedImageUrl).toContain('data:image/svg+xml');
    });

    it('PATCH /api/ai/contents/:id/submit allows blank content for image-only posts with a generated image', async () => {
      queryMock.mockImplementation(async (sql: string) => {
        if (sql.includes('CREATE TABLE') || sql.includes('ALTER TABLE')) {
          return { rows: [], rowCount: 0 } as any;
        }

        if (sql.includes('SELECT id, output_mode, generated_image_url, content')) {
          return {
            rows: [
              {
                id: 77,
                output_mode: 'image',
                generated_image_url: 'data:image/png;base64,QUJDRA==',
                content: 'Poster generated for review.',
              },
            ],
            rowCount: 1,
          } as any;
        }

        if (sql.includes('UPDATE ai_contents')) {
          return {
            rows: [
              {
                id: 77,
                title: 'Image-only test',
                content: '',
                platform: 'facebook',
                hashtags: '#BellahBeatrix',
                status: 'pending',
                createdAt: new Date().toISOString(),
              },
            ],
            rowCount: 1,
          } as any;
        }

        return { rows: [], rowCount: 0 } as any;
      });

      const app = createApp();
      const res = await request(app).patch('/api/ai/contents/77/submit').send({
        title: 'Image-only test',
        content: '',
        hashtags: '#BellahBeatrix',
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        data: {
          id: 77,
          title: 'Image-only test',
          content: '',
          status: 'pending',
        },
      });
    });

    it('PATCH /api/ai/contents/:id/submit still rejects blank content for text-only posts', async () => {
      queryMock.mockImplementation(async (sql: string) => {
        if (sql.includes('CREATE TABLE') || sql.includes('ALTER TABLE')) {
          return { rows: [], rowCount: 0 } as any;
        }

        if (sql.includes('SELECT id, output_mode, generated_image_url, content')) {
          return {
            rows: [
              {
                id: 77,
                output_mode: 'text',
                generated_image_url: null,
                content: 'Existing text content',
              },
            ],
            rowCount: 1,
          } as any;
        }

        return { rows: [], rowCount: 0 } as any;
      });

      const app = createApp();
      const res = await request(app).patch('/api/ai/contents/77/submit').send({
        title: 'Text-only test',
        content: '',
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        ok: false,
        message: 'content is required unless this is an image-only post with a generated image',
      });
    });
  });
});
