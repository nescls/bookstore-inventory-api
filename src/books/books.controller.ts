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
import { BooksService } from "./books.service";
import { booksRoutes } from "./books.routes";
import {
  bookId,
  createBookSchema,
  updateBookSchema,
  listSchema,
  searchSchema,
  lowStockSchema,
} from "./model/books.schemas";
import { parse } from "../common/validation";
@Controller()
export class BooksController {
  constructor(@Inject(BooksService) private readonly books: BooksService) {}
  @Post(booksRoutes.list) create(@Body() body: unknown) {
    return this.books.create(parse(createBookSchema, body));
  }
  @Get(booksRoutes.list) list(@Query() query: unknown) {
    const { page, limit } = parse(listSchema, query);
    return this.books.findPage(page, limit);
  }
  @Get(booksRoutes.search) search(@Query() query: unknown) {
    const { page, limit, category } = parse(searchSchema, query);
    return this.books.findPage(page, limit, { category });
  }
  @Get(booksRoutes.lowStock) lowStock(@Query() query: unknown) {
    const { page, limit, threshold } = parse(lowStockSchema, query);
    return this.books.findPage(page, limit, { threshold });
  }
  @Put(booksRoutes.byId) edit(@Param("id") id: string, @Body() body: unknown) {
    return this.books.edit(bookId(id), parse(updateBookSchema, body));
  }
  @Post(booksRoutes.calculatePrice) @HttpCode(200) calculate(
    @Param("id") id: string,
  ) {
    return this.books.calculate(bookId(id));
  }
  @Delete(booksRoutes.byId) @HttpCode(204) remove(@Param("id") id: string) {
    return this.books.remove(bookId(id));
  }
  @Get(booksRoutes.byId) get(@Param("id") id: string) {
    return this.books.get(bookId(id));
  }
}
