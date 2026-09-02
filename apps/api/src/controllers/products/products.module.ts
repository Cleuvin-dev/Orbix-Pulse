import { Module } from "@nestjs/common";

import { ProductCategoriesService } from "../../application/products/product-categories.service";
import { ProductsService } from "../../application/products/products.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { ProductCategoriesController } from "./product-categories.controller";
import { ProductsController } from "./products.controller";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [ProductsController, ProductCategoriesController],
  providers: [ProductsService, ProductCategoriesService],
})
export class ProductsModule {}
