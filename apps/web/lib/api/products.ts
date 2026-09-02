import type { CreateProductCategoryInput, CreateProductInput, UpdateProductInput } from "@orbix/validation";

import { apiClient } from "./client";

// Formas espelham a resposta real de apps/api (Fase 4) — Decimal (current_stock,
// minimum_stock) vem serializado como string pelo Prisma/JSON.
export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  categoryId: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: string;
  minimumStock: string | null;
  maximumStock: string | null;
  supplierId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  parentId: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListProductsParams {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export function listProducts(params: ListProductsParams = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 50));
  return apiClient.get<PaginatedResult<Product>>(`/v1/products?${query.toString()}`);
}

export function createProduct(input: CreateProductInput) {
  return apiClient.post<Product>("/v1/products", input);
}

export function updateProduct(id: string, input: UpdateProductInput) {
  return apiClient.patch<Product>(`/v1/products/${id}`, input);
}

export function deleteProduct(id: string) {
  return apiClient.delete<void>(`/v1/products/${id}`);
}

export function listProductCategories() {
  return apiClient.get<ProductCategory[]>("/v1/product-categories");
}

export function createProductCategory(input: CreateProductCategoryInput) {
  return apiClient.post<ProductCategory>("/v1/product-categories", input);
}
