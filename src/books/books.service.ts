import { Inject, Injectable } from "@nestjs/common";
import { DataSource, FindOptionsWhere, ILike, LessThan } from "typeorm";
import Decimal from "decimal.js";
import { Book, BookEntity } from "./book.entity";
import { publicBook } from "./book.presenter";
import { CreateBookInput, UpdateBookInput } from "./books.schemas";
import { PricingService } from "../pricing/pricing.service";
import { ApiError } from "../common/errors";
export interface BookFilters {
  category?: string;
  threshold?: number;
}
@Injectable()
export class BooksService {
  constructor(
    @Inject(DataSource) private readonly db: DataSource,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}
  async create(input: CreateBookInput) {
    const repo = this.db.getRepository(BookEntity);
    return publicBook(
      await repo.save(
        repo.create({
          ...input,
          cost_usd: String(input.cost_usd),
          selling_price_local: null,
        }),
      ),
    );
  }
  async findPage(page: number, limit: number, filters: BookFilters = {}) {
    const where: FindOptionsWhere<Book> = {};
    if (filters.category !== undefined) {
      // Category is an exact case-insensitive match, not a wildcard interface.
      where.category = ILike(filters.category.replace(/[\\%_]/g, "\\$&"));
    }
    if (filters.threshold !== undefined)
      where.stock_quantity = LessThan(filters.threshold);
    const [books, total] = await this.db
      .getRepository(BookEntity)
      .findAndCount({
        where: { ...where },
        order: { id: "ASC" },
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      data: books.map(publicBook),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
  async edit(id: number, input: UpdateBookInput) {
    return this.db.transaction(async (manager) => {
      const repo = manager.getRepository(BookEntity);
      const book = await repo.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!book) throw new ApiError("bookNotFound", 404);
      const { cost_usd, ...fields } = input;
      const changes: Partial<Book> = { ...fields };
      if (cost_usd !== undefined) {
        changes.cost_usd = String(cost_usd);
        if (!new Decimal(book.cost_usd).eq(cost_usd)) {
          changes.selling_price_local = (
            await this.pricing.calculate(String(cost_usd), manager)
          ).selling_price_local;
        }
      }
      await repo.update(book.id, changes);
      return publicBook(await repo.findOneByOrFail({ id: book.id }));
    });
  }
  async calculate(id: number) {
    return this.db.transaction(async (manager) => {
      const repo = manager.getRepository(BookEntity);
      const book = await repo.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!book) throw new ApiError("bookNotFound", 404);
      const result = await this.pricing.calculate(book.cost_usd, manager);
      await repo.update(book.id, {
        selling_price_local: result.selling_price_local,
      });
      return {
        book_id: book.id,
        ...result,
        selling_price_local: Number(result.selling_price_local),
      };
    });
  }
  async remove(id: number) {
    const result = await this.db.getRepository(BookEntity).delete({ id });
    if (!result.affected) throw new ApiError("bookNotFound", 404);
  }
  async get(id: number) {
    const book = await this.db.getRepository(BookEntity).findOneBy({ id });
    if (!book) throw new ApiError("bookNotFound", 404);
    return publicBook(book);
  }
}
