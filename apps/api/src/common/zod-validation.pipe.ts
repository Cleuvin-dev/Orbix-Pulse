import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z, ZodType } from "zod";

// docs/09-api.md (9.8): todo payload de entrada é validado com o mesmo schema
// Zod usado no frontend (packages/validation) — validação de formato, não de
// regra de negócio (essa fica na camada de aplicação).
export class ZodValidationPipe<Schema extends ZodType> implements PipeTransform<unknown, z.infer<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.infer<Schema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
