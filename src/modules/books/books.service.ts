import { Inject, Injectable } from "@nestjs/common";
import { DataSource, FindOptionsWhere, ILike, LessThan } from "typeorm";
import Decimal from "decimal.js";
import { Book, BookEntity } from "./entities/book.entity";
import { serializeBook } from "./utils/serialize-book";
import { CreateBookInput, UpdateBookInput } from "./dto/books.schemas";
import { PricingService } from "../pricing/pricing.service";
import { ApiError } from "../../common/errors/api-error";
import { requireCanonicalIsbn } from "./utils/isbn";

export interface BookFilters {
  category?: string;
  threshold?: number;
}

@Injectable()
export class BooksService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(PricingService) private readonly pricingService: PricingService,
  ) {}

  async create(input: CreateBookInput) {
    const bookRepository = this.dataSource.getRepository(BookEntity);
    return serializeBook(
      await bookRepository.save(
        bookRepository.create({
          ...input,
          isbn_canonical: requireCanonicalIsbn(input.isbn),
          cost_usd: String(input.cost_usd),
          selling_price_local: null,
        }),
      ),
    );
  }

  async paginate(page: number, limit: number, filters: BookFilters = {}) {
    const where: FindOptionsWhere<Book> = {};
    if (filters.category !== undefined) {
      // Category is an exact case-insensitive match, not a wildcard interface.
      where.category = ILike(filters.category.replace(/[\\%_]/g, "\\$&"));
    }
    if (filters.threshold !== undefined)
      where.stock_quantity = LessThan(filters.threshold);
    const [books, total] = await this.dataSource
      .getRepository(BookEntity)
      .findAndCount({
        where: { ...where },
        order: { id: "ASC" },
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      data: books.map(serializeBook),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: number, input: UpdateBookInput) {
    return this.dataSource.transaction(async (manager) => {
      const bookRepository = manager.getRepository(BookEntity);
      const book = await bookRepository.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!book) throw new ApiError("bookNotFound", 404);
      const { cost_usd, ...fields } = input;
      const changes: Partial<Book> = { ...fields };
      if (fields.isbn !== undefined)
        changes.isbn_canonical = requireCanonicalIsbn(fields.isbn);
      if (cost_usd !== undefined) {
        changes.cost_usd = String(cost_usd);
        if (!new Decimal(book.cost_usd).eq(cost_usd)) {
          changes.selling_price_local = (
            await this.pricingService.calculate(String(cost_usd), manager)
          ).selling_price_local;
        }
      }
      await bookRepository.update(book.id, changes);
      return serializeBook(
        await bookRepository.findOneByOrFail({ id: book.id }),
      );
    });
  }

  async calculatePrice(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const bookRepository = manager.getRepository(BookEntity);
      const book = await bookRepository.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!book) throw new ApiError("bookNotFound", 404);
      const price = await this.pricingService.calculate(book.cost_usd, manager);
      await bookRepository.update(book.id, {
        selling_price_local: price.selling_price_local,
      });
      return {
        book_id: book.id,
        ...price,
        selling_price_local: Number(price.selling_price_local),
      };
    });
  }

  async delete(id: number) {
    const result = await this.dataSource
      .getRepository(BookEntity)
      .delete({ id });
    if (!result.affected) throw new ApiError("bookNotFound", 404);
  }

  async find(id: number) {
    const book = await this.dataSource
      .getRepository(BookEntity)
      .findOneBy({ id });
    if (!book) throw new ApiError("bookNotFound", 404);
    return serializeBook(book);
  }
}
