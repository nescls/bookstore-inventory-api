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
  parseBookId,
  createBookSchema,
  updateBookSchema,
  listSchema,
  searchSchema,
  lowStockSchema,
} from "./dto/books.schemas";
import { parse } from "../../common/utils/parse";

@Controller()
export class BooksController {
  constructor(
    @Inject(BooksService) private readonly booksService: BooksService,
  ) {}

  @Post(booksRoutes.list) create(@Body() body: unknown) {
    return this.booksService.create(parse(createBookSchema, body));
  }

  @Get(booksRoutes.list) findAll(@Query() query: unknown) {
    const { page, limit } = parse(listSchema, query);
    return this.booksService.paginate(page, limit);
  }

  @Get(booksRoutes.search) search(@Query() query: unknown) {
    const { page, limit, category } = parse(searchSchema, query);
    return this.booksService.paginate(page, limit, { category });
  }

  @Get(booksRoutes.lowStock) lowStock(@Query() query: unknown) {
    const { page, limit, threshold } = parse(lowStockSchema, query);
    return this.booksService.paginate(page, limit, { threshold });
  }

  @Put(booksRoutes.byId) update(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.booksService.update(
      parseBookId(id),
      parse(updateBookSchema, body),
    );
  }

  @Post(booksRoutes.calculatePrice) @HttpCode(200) calculatePrice(
    @Param("id") id: string,
  ) {
    return this.booksService.calculatePrice(parseBookId(id));
  }

  @Delete(booksRoutes.byId) @HttpCode(204) delete(@Param("id") id: string) {
    return this.booksService.delete(parseBookId(id));
  }

  @Get(booksRoutes.byId) find(@Param("id") id: string) {
    return this.booksService.find(parseBookId(id));
  }
}
