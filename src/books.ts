import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Delete,
  HttpCode,
  Put,
} from "@nestjs/common";
import { DataSource, FindOptionsWhere, ILike, LessThan } from "typeorm";
import { Book, BookEntity, publicBook } from "./database";
import Decimal from "decimal.js";
import { Pricing } from "./pricing";
import { ApiError } from "./errors";
import {
  bookId,
  createBookSchema,
  parse,
  listSchema,
  searchSchema,
  lowStockSchema,
  updateBookSchema,
} from "./validation";
@Controller("books")
export class BooksController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  @Post() async create(@Body() body: unknown) {
    const input = parse(createBookSchema, body);
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
  private async findPage(
    page: number,
    limit: number,
    where: FindOptionsWhere<Book> = {},
  ) {
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
  @Get() list(@Query() query: unknown) {
    const { page, limit } = parse(listSchema, query);
    return this.findPage(page, limit);
  }
  @Get("search") search(@Query() query: unknown) {
    const { page, limit, category } = parse(searchSchema, query);
    // Escape LIKE metacharacters: category search is exact, not a wildcard interface.
    const escaped = category.replace(/[\\%_]/g, "\\$&");
    return this.findPage(page, limit, { category: ILike(escaped) });
  }
  @Get("low-stock") lowStock(@Query() query: unknown) {
    const { page, limit, threshold } = parse(lowStockSchema, query);
    return this.findPage(page, limit, { stock_quantity: LessThan(threshold) });
  }
  @Put(":id") async edit(@Param("id") id: string, @Body() body: unknown) {
    const numericId = bookId(id);
    const input = parse(updateBookSchema, body);
    return this.db.transaction(async (manager) => {
      const repo = manager.getRepository(BookEntity);
      const book = await repo.findOne({
        where: { id: numericId },
        lock: { mode: "pessimistic_write" },
      });
      if (!book) throw new ApiError("bookNotFound", 404);
      const { cost_usd, ...fields } = input;
      const changes: Partial<Book> = { ...fields };
      if (cost_usd !== undefined) {
        changes.cost_usd = String(cost_usd);
        if (!new Decimal(book.cost_usd).eq(cost_usd)) {
          changes.selling_price_local = (
            await new Pricing(manager).calculate(String(cost_usd))
          ).selling_price_local;
        }
      }
      await repo.update(book.id, changes);
      return publicBook(await repo.findOneByOrFail({ id: book.id }));
    });
  }
  @Post(":id/calculate-price") @HttpCode(200) async calculate(
    @Param("id") id: string,
  ) {
    const numericId = bookId(id);
    return this.db.transaction(async (manager) => {
      const repo = manager.getRepository(BookEntity);
      const book = await repo.findOne({
        where: { id: numericId },
        lock: { mode: "pessimistic_write" },
      });
      if (!book) throw new ApiError("bookNotFound", 404);
      const result = await new Pricing(manager).calculate(book.cost_usd);
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
  @Delete(":id") @HttpCode(204) async remove(@Param("id") id: string) {
    const result = await this.db
      .getRepository(BookEntity)
      .delete({ id: bookId(id) });
    if (!result.affected) throw new ApiError("bookNotFound", 404);
  }
  @Get(":id") async get(@Param("id") id: string) {
    const book = await this.db
      .getRepository(BookEntity)
      .findOneBy({ id: bookId(id) });
    if (!book) throw new ApiError("bookNotFound", 404);
    return publicBook(book);
  }
}
